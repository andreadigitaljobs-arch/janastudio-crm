-- JanaStudio: inventario operativo, recetas y rentabilidad histórica.
begin;

alter table janastudio.inventory
  add column if not exists location text not null default 'studio',
  add column if not exists package_size numeric not null default 1,
  add column if not exists expected_services numeric not null default 0;

alter table janastudio.inventory drop constraint if exists inventory_location_check;
alter table janastudio.inventory add constraint inventory_location_check check (location in ('studio', 'home'));
alter table janastudio.inventory drop constraint if exists inventory_package_size_check;
alter table janastudio.inventory add constraint inventory_package_size_check check (package_size > 0);
alter table janastudio.inventory drop constraint if exists inventory_expected_services_check;
alter table janastudio.inventory add constraint inventory_expected_services_check check (expected_services >= 0);

create or replace function janastudio.sync_inventory_recipe_cost()
returns trigger
language plpgsql
set search_path = janastudio, pg_temp
as $$
begin
  update janastudio.service_costs
  set unit_cost = coalesce(new.cost, 0) / greatest(coalesce(new.package_size, 1), 0.000001),
      item_name = new.name,
      unit = coalesce(new.unit, 'unidad')
  where inventory_item_id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_inventory_recipe_cost_trigger on janastudio.inventory;
create trigger sync_inventory_recipe_cost_trigger
after update of cost, package_size, name, unit on janastudio.inventory
for each row execute function janastudio.sync_inventory_recipe_cost();

create table if not exists janastudio.service_profit_snapshots (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references janastudio.transactions(id) on delete cascade,
  appointment_id uuid references janastudio.appointments(id) on delete set null,
  appointment_service_id uuid references janastudio.appointment_services(id) on delete set null,
  service_id uuid references janastudio.services(id) on delete set null,
  source_key text not null,
  service_name text not null,
  category text,
  revenue numeric not null default 0,
  material_cost numeric not null default 0,
  staff_cost numeric not null default 0,
  salon_profit numeric generated always as (revenue - material_cost - staff_cost) stored,
  exchange_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (transaction_id, source_key)
);

create index if not exists service_profit_snapshots_created_idx on janastudio.service_profit_snapshots(created_at);
create index if not exists service_profit_snapshots_service_idx on janastudio.service_profit_snapshots(service_id);

alter table janastudio.service_profit_snapshots enable row level security;
drop policy if exists service_profit_snapshots_select on janastudio.service_profit_snapshots;
create policy service_profit_snapshots_select on janastudio.service_profit_snapshots
  for select to authenticated using (janastudio.is_active_staff());

create or replace function janastudio.snapshot_checkout_profit()
returns trigger
language plpgsql
security definer
set search_path = janastudio, pg_temp
as $$
begin
  if new.type <> 'income' then return new; end if;

  insert into janastudio.service_profit_snapshots(
    transaction_id, appointment_id, appointment_service_id, service_id, source_key,
    service_name, category, revenue, material_cost, staff_cost, exchange_rate, created_at
  )
  with appointment_ids as (
    select value::uuid as id
    from jsonb_array_elements_text(
      case when jsonb_typeof(new.metadata->'appointmentIds') = 'array'
        then new.metadata->'appointmentIds' else '[]'::jsonb end
    )
    union
    select nullif(coalesce(new.metadata->>'appointment_id', new.metadata->>'appointmentId'), '')::uuid
  ), performed_services as (
    select a.id as appointment_id, null::uuid as appointment_service_id, a.service_id,
           coalesce(nullif(a.total_price, 0), s.price, 0) as revenue
    from janastudio.appointments a
    join appointment_ids ai on ai.id = a.id
    join janastudio.services s on s.id = a.service_id
    where a.service_id is not null
      and not exists (
        select 1 from janastudio.appointment_services aps
        where aps.appointment_id = a.id and aps.service_id = a.service_id
      )
    union all
    select aps.appointment_id, aps.id, aps.service_id,
           coalesce(nullif(aps.price_paid, 0), s.price, 0)
    from janastudio.appointment_services aps
    join appointment_ids ai on ai.id = aps.appointment_id
    join janastudio.services s on s.id = aps.service_id
  )
  select new.id, ps.appointment_id, ps.appointment_service_id, s.id,
         ps.appointment_id::text || ':' || coalesce(ps.appointment_service_id::text, 'main'),
         s.name, s.category, ps.revenue,
         coalesce((select sum(sc.quantity_per_service * sc.unit_cost) from janastudio.service_costs sc where sc.service_id = s.id), 0),
         ps.revenue * coalesce(s.commission_pct, 0) / 100,
         coalesce(new.exchange_rate, 0), new.created_at
  from performed_services ps
  join janastudio.services s on s.id = ps.service_id
  on conflict (transaction_id, source_key) do nothing;

  return new;
end;
$$;

drop trigger if exists snapshot_checkout_profit_trigger on janastudio.transactions;
create trigger snapshot_checkout_profit_trigger
after insert on janastudio.transactions
for each row execute function janastudio.snapshot_checkout_profit();

create or replace function janastudio.calculate_service_profit(p_service_id uuid)
returns table (
  service_name text, selling_price numeric, total_cost numeric,
  profit numeric, profit_margin numeric
)
language sql stable
set search_path = janastudio
as $$
  select s.name, s.price,
    coalesce(sum(sc.quantity_per_service * sc.unit_cost), 0) + s.price * coalesce(s.commission_pct, 0) / 100,
    s.price - coalesce(sum(sc.quantity_per_service * sc.unit_cost), 0) - s.price * coalesce(s.commission_pct, 0) / 100,
    case when s.price > 0 then
      ((s.price - coalesce(sum(sc.quantity_per_service * sc.unit_cost), 0) - s.price * coalesce(s.commission_pct, 0) / 100) / s.price) * 100
    else 0 end
  from janastudio.services s
  left join janastudio.service_costs sc on sc.service_id = s.id
  where s.id = p_service_id
  group by s.id, s.name, s.price, s.commission_pct;
$$;

create or replace function janastudio.get_profitability_report(
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns table (
  service_id uuid,
  service_name text,
  category text,
  price numeric,
  estimated_material_cost numeric,
  estimated_staff_cost numeric,
  estimated_profit numeric,
  estimated_margin numeric,
  services_completed bigint,
  actual_revenue numeric,
  actual_material_cost numeric,
  actual_staff_cost numeric,
  actual_profit numeric
)
language sql
security definer
set search_path = janastudio, pg_temp
as $$
  with catalog as (
    select s.id, s.name, s.category, coalesce(s.price, 0) as price,
      coalesce(sum(sc.quantity_per_service * sc.unit_cost), 0) as materials,
      coalesce(s.price, 0) * coalesce(s.commission_pct, 0) / 100 as staff_cost
    from janastudio.services s
    left join janastudio.service_costs sc on sc.service_id = s.id
    where coalesce(s.active, true)
    group by s.id, s.name, s.category, s.price, s.commission_pct
  ), actual as (
    select sp.service_id, count(*) as completed, sum(sp.revenue) as revenue,
      sum(sp.material_cost) as materials, sum(sp.staff_cost) as staff_cost,
      sum(sp.salon_profit) as profit
    from janastudio.service_profit_snapshots sp
    where sp.created_at >= p_start_date and sp.created_at < p_end_date
    group by sp.service_id
  )
  select c.id, c.name, c.category, c.price, c.materials, c.staff_cost,
    c.price - c.materials - c.staff_cost,
    case when c.price > 0 then ((c.price - c.materials - c.staff_cost) / c.price) * 100 else 0 end,
    coalesce(a.completed, 0), coalesce(a.revenue, 0), coalesce(a.materials, 0),
    coalesce(a.staff_cost, 0), coalesce(a.profit, 0)
  from catalog c left join actual a on a.service_id = c.id
  order by c.price - c.materials - c.staff_cost desc, c.name;
$$;

revoke all on function janastudio.get_profitability_report(timestamptz, timestamptz) from public, anon;
grant execute on function janastudio.get_profitability_report(timestamptz, timestamptz) to authenticated;
grant select on janastudio.service_profit_snapshots to authenticated;

commit;
