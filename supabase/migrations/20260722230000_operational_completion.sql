-- JanaStudio: agenda real, laser, promociones, trazabilidad y contabilidad operativa.
begin;

create table if not exists janastudio.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references janastudio.staff(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_working boolean not null default true,
  start_time time,
  end_time time,
  updated_at timestamptz not null default now(),
  unique (staff_id, day_of_week),
  check (not is_working or (start_time is not null and end_time is not null and start_time < end_time))
);

create table if not exists janastudio.staff_time_off (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references janastudio.staff(id) on delete cascade,
  date date not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (staff_id, date)
);

create table if not exists janastudio.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references janastudio.staff(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

insert into janastudio.staff_schedules(staff_id, day_of_week, is_working, start_time, end_time)
select s.id, d.day, d.day <> 0,
       case when d.day <> 0 then '09:00'::time end,
       case when d.day <> 0 then '18:00'::time end
from janastudio.staff s cross join generate_series(0, 6) d(day)
on conflict (staff_id, day_of_week) do nothing;

create or replace function janastudio.create_appointment_order(p_appointment jsonb, p_services jsonb)
returns uuid language plpgsql security definer set search_path = janastudio, pg_temp as $$
declare v_id uuid; v_service jsonb; v_first timestamptz; v_staff uuid;
begin
  if not janastudio.is_active_staff() then raise exception 'Unauthorized'; end if;
  select min((value->>'scheduled_at')::timestamptz) into v_first
  from jsonb_array_elements(coalesce(p_services, '[]'::jsonb));
  select id into v_staff from janastudio.staff where auth_user_id = auth.uid() and active limit 1;
  insert into janastudio.appointments(client_id, status, total_price, scheduled_at, notes, created_by_staff_id)
  values ((p_appointment->>'client_id')::uuid, coalesce(p_appointment->>'status','Agendado'), 0,
          coalesce(v_first, (p_appointment->>'scheduled_at')::timestamptz), p_appointment->>'notes', v_staff)
  returning id into v_id;
  for v_service in select value from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    insert into janastudio.appointment_services(
      appointment_id, service_id, staff_id, sequence_order, price_paid,
      scheduled_at, duration_minutes, status
    ) values (
      v_id, (v_service->>'service_id')::uuid, (v_service->>'staff_id')::uuid,
      coalesce((v_service->>'sequence_order')::integer, 0),
      coalesce((v_service->>'price_paid')::numeric, 0),
      (v_service->>'scheduled_at')::timestamptz,
      greatest(coalesce((v_service->>'duration_minutes')::integer, 60), 1), 'Pendiente'
    );
  end loop;
  return v_id;
end $$;

create table if not exists janastudio.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric not null check (discount_value > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  scope text not null default 'all' check (scope in ('all','service','category','client')),
  service_id uuid references janastudio.services(id) on delete cascade,
  category text,
  client_id uuid references janastudio.clients(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table if not exists janastudio.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references janastudio.promotions(id) on delete restrict,
  transaction_id uuid references janastudio.transactions(id) on delete set null,
  appointment_id uuid references janastudio.appointments(id) on delete set null,
  client_id uuid references janastudio.clients(id) on delete set null,
  original_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  final_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create or replace function janastudio.snapshot_promotion_redemption()
returns trigger language plpgsql security definer set search_path=janastudio,pg_temp as $$
begin
  if new.type='income' and nullif(new.metadata->>'promotionId','') is not null
     and coalesce((new.metadata->>'discountAmount')::numeric,0)>0 then
    insert into janastudio.promotion_redemptions(promotion_id,transaction_id,appointment_id,client_id,original_amount,discount_amount,final_amount)
    values((new.metadata->>'promotionId')::uuid,new.id,nullif(new.metadata->>'appointmentId','')::uuid,new.client_id,
      coalesce((new.metadata->>'originalAmount')::numeric,new.amount),
      coalesce((new.metadata->>'discountAmount')::numeric,0),new.amount);
  end if;
  return new;
end $$;
drop trigger if exists snapshot_promotion_redemption_trigger on janastudio.transactions;
create trigger snapshot_promotion_redemption_trigger after insert on janastudio.transactions
for each row execute function janastudio.snapshot_promotion_redemption();

create table if not exists janastudio.inventory_containers (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references janastudio.inventory(id) on delete cascade,
  lot_code text,
  location text not null default 'studio' check (location in ('studio','home')),
  opening_quantity numeric not null check (opening_quantity > 0),
  remaining_quantity numeric not null check (remaining_quantity >= 0),
  expected_services numeric not null default 0 check (expected_services >= 0),
  services_count integer not null default 0 check (services_count >= 0),
  status text not null default 'open' check (status in ('open','closed','discarded')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  close_reason text,
  opened_by uuid references janastudio.staff(id) on delete set null,
  closed_by uuid references janastudio.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists janastudio.inventory_container_usage (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references janastudio.inventory_containers(id) on delete cascade,
  appointment_service_id uuid references janastudio.appointment_services(id) on delete set null,
  quantity_used numeric not null check (quantity_used > 0),
  reason text not null default 'service',
  staff_id uuid references janastudio.staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function janastudio.consume_open_containers_for_service()
returns trigger language plpgsql security definer set search_path=janastudio,pg_temp as $$
declare r record; c janastudio.inventory_containers%rowtype; v_used numeric;
begin
  for r in select inventory_item_id, quantity_per_service from janastudio.service_costs where service_id=new.service_id loop
    select * into c from janastudio.inventory_containers
    where inventory_item_id=r.inventory_item_id and status='open' and remaining_quantity>0
    order by opened_at for update skip locked limit 1;
    if c.id is null then continue; end if;
    v_used := least(c.remaining_quantity,r.quantity_per_service);
    update janastudio.inventory_containers set remaining_quantity=remaining_quantity-v_used,
      services_count=services_count+1,
      status=case when remaining_quantity-v_used<=0 then 'closed' else status end,
      closed_at=case when remaining_quantity-v_used<=0 then now() else closed_at end,
      close_reason=case when remaining_quantity-v_used<=0 then 'Consumido por servicios' else close_reason end
    where id=c.id;
    insert into janastudio.inventory_container_usage(container_id,appointment_service_id,quantity_used,reason)
    values(c.id,new.appointment_service_id,v_used,'service');
  end loop;
  return new;
end $$;
drop trigger if exists consume_open_containers_trigger on janastudio.service_profit_snapshots;
create trigger consume_open_containers_trigger after insert on janastudio.service_profit_snapshots
for each row execute function janastudio.consume_open_containers_for_service();

alter table janastudio.client_packages
  add column if not exists session_interval_days integer not null default 21,
  add column if not exists worker_pct numeric not null default 30,
  add column if not exists partner_pct numeric not null default 40,
  add column if not exists studio_pct numeric not null default 30;
alter table janastudio.package_installments
  add column if not exists due_at timestamptz,
  add column if not exists payment_method text,
  add column if not exists transaction_id uuid references janastudio.transactions(id) on delete set null;
alter table janastudio.package_sessions
  add column if not exists scheduled_at timestamptz,
  add column if not exists before_photo_url text,
  add column if not exists after_photo_url text,
  add column if not exists staff_id uuid references janastudio.staff(id) on delete set null;

create table if not exists janastudio.laser_revenue_allocations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references janastudio.transactions(id) on delete cascade,
  client_package_id uuid references janastudio.client_packages(id) on delete set null,
  worker_amount numeric not null default 0,
  partner_supplies_amount numeric not null default 0,
  studio_amount numeric not null default 0,
  supplies_spent numeric not null default 0,
  created_at timestamptz not null default now()
);
create or replace function janastudio.allocate_laser_revenue()
returns trigger language plpgsql security definer set search_path=janastudio,pg_temp as $$
begin
  if new.type='income' and new.category='Centro Laser' then
    insert into janastudio.laser_revenue_allocations(transaction_id,client_package_id,worker_amount,partner_supplies_amount,studio_amount)
    values(new.id,nullif(new.metadata->>'client_package_id','')::uuid,new.amount*.30,new.amount*.40,new.amount*.30)
    on conflict(transaction_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists allocate_laser_revenue_trigger on janastudio.transactions;
create trigger allocate_laser_revenue_trigger after insert on janastudio.transactions
for each row execute function janastudio.allocate_laser_revenue();

create or replace function janastudio.sell_laser_package(
  p_client_id uuid, p_service_id uuid, p_sessions integer, p_total numeric,
  p_payment_mode text, p_payment_method text, p_exchange_rate numeric
) returns uuid language plpgsql security definer set search_path = janastudio, pg_temp as $$
declare v_pkg uuid; v_tx uuid; v_initial numeric; v_staff uuid; v_exp timestamptz := now() + interval '10 months';
begin
  if not janastudio.is_active_staff() then raise exception 'Unauthorized'; end if;
  if p_sessions not in (1,4,8) then raise exception 'Las sesiones deben ser 1, 4 u 8'; end if;
  select id into v_staff from janastudio.staff where auth_user_id=auth.uid() and active limit 1;
  v_initial := case when p_payment_mode='financed' and p_sessions=8 then p_total*.30 else p_total end;
  insert into janastudio.client_packages(client_id,service_id,total_sessions,used_sessions,status,total_amount,expires_at)
  values(p_client_id,p_service_id,p_sessions,0,'active',p_total,v_exp) returning id into v_pkg;
  insert into janastudio.transactions(description,amount,type,category,payment_method,exchange_rate,currency,metadata,created_by_staff_id,client_id)
  values('Venta paquete laser',v_initial,'income','Centro Laser',p_payment_method,p_exchange_rate,'USD',
         jsonb_build_object('client_package_id',v_pkg,'service_id',p_service_id,'total_sessions',p_sessions),v_staff,p_client_id)
  returning id into v_tx;
  if p_sessions=8 and p_payment_mode='financed' then
    insert into janastudio.package_installments(client_package_id,installment_number,amount,status,paid_at,due_at,payment_method,transaction_id) values
      (v_pkg,1,p_total*.30,'paid',now(),now(),p_payment_method,v_tx),
      (v_pkg,2,p_total*.40,'pending',null,now()+interval '2 months',null,null),
      (v_pkg,3,p_total*.30,'pending',null,now()+interval '4 months',null,null);
  else
    insert into janastudio.package_installments(client_package_id,installment_number,amount,status,paid_at,due_at,payment_method,transaction_id)
    values(v_pkg,1,p_total,'paid',now(),now(),p_payment_method,v_tx);
  end if;
  return v_pkg;
end $$;

create or replace function janastudio.pay_package_installment(p_installment_id uuid,p_method text,p_exchange_rate numeric)
returns uuid language plpgsql security definer set search_path=janastudio,pg_temp as $$
declare v_inst janastudio.package_installments%rowtype; v_pkg janastudio.client_packages%rowtype; v_tx uuid; v_staff uuid;
begin
  if not janastudio.is_active_staff() then raise exception 'Unauthorized'; end if;
  select * into v_inst from janastudio.package_installments where id=p_installment_id for update;
  if v_inst.status='paid' then return v_inst.transaction_id; end if;
  select * into v_pkg from janastudio.client_packages where id=v_inst.client_package_id;
  select id into v_staff from janastudio.staff where auth_user_id=auth.uid() and active limit 1;
  insert into janastudio.transactions(description,amount,type,category,payment_method,exchange_rate,currency,metadata,created_by_staff_id,client_id)
  values('Cuota paquete laser '||v_inst.installment_number,v_inst.amount,'income','Centro Laser',p_method,p_exchange_rate,'USD',
    jsonb_build_object('client_package_id',v_pkg.id,'installment_id',v_inst.id),v_staff,v_pkg.client_id) returning id into v_tx;
  update janastudio.package_installments set status='paid',paid_at=now(),payment_method=p_method,transaction_id=v_tx where id=v_inst.id;
  return v_tx;
end $$;

create table if not exists janastudio.chart_of_accounts (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  account_type text not null check(account_type in ('asset','liability','equity','income','expense')),
  active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists janastudio.journal_entries (
  id uuid primary key default gen_random_uuid(), entry_date date not null default current_date,
  description text not null, reference text, status text not null default 'posted' check(status in ('draft','posted','void')),
  created_by uuid references janastudio.staff(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists janastudio.journal_lines (
  id uuid primary key default gen_random_uuid(), journal_entry_id uuid not null references janastudio.journal_entries(id) on delete cascade,
  account_id uuid not null references janastudio.chart_of_accounts(id), debit numeric not null default 0,
  credit numeric not null default 0, description text, check(debit>=0 and credit>=0 and not(debit>0 and credit>0))
);
create table if not exists janastudio.bank_statement_lines (
  id uuid primary key default gen_random_uuid(), transaction_date date not null, description text not null,
  amount numeric not null, reference text, reconciled boolean not null default false,
  transaction_id uuid references janastudio.transactions(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists janastudio.payables_receivables (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('payable','receivable')),
  counterparty text not null, description text not null, amount numeric not null check(amount>=0),
  paid_amount numeric not null default 0 check(paid_amount>=0), due_date date, status text not null default 'pending',
  client_id uuid references janastudio.clients(id) on delete set null, created_at timestamptz not null default now()
);
create or replace function janastudio.post_journal_entry(p_entry jsonb,p_lines jsonb)
returns uuid language plpgsql security definer set search_path=janastudio,pg_temp as $$
declare v_id uuid; v_line jsonb; v_debit numeric; v_credit numeric; v_staff uuid;
begin
  if not janastudio.is_active_staff() then raise exception 'Unauthorized'; end if;
  select coalesce(sum((value->>'debit')::numeric),0),coalesce(sum((value->>'credit')::numeric),0)
  into v_debit,v_credit from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb));
  if v_debit<=0 or abs(v_debit-v_credit)>0.005 then raise exception 'El asiento debe estar balanceado'; end if;
  select id into v_staff from janastudio.staff where auth_user_id=auth.uid() and active limit 1;
  insert into janastudio.journal_entries(entry_date,description,reference,status,created_by)
  values(coalesce((p_entry->>'entry_date')::date,current_date),p_entry->>'description',p_entry->>'reference','posted',v_staff) returning id into v_id;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    insert into janastudio.journal_lines(journal_entry_id,account_id,debit,credit,description)
    values(v_id,(v_line->>'account_id')::uuid,coalesce((v_line->>'debit')::numeric,0),coalesce((v_line->>'credit')::numeric,0),v_line->>'description');
  end loop;
  return v_id;
end $$;
insert into janastudio.chart_of_accounts(code,name,account_type) values
 ('1.1.01','Caja','asset'),('1.1.02','Banco','asset'),('1.1.03','Cuentas por cobrar','asset'),
 ('2.1.01','Cuentas por pagar','liability'),('3.1.01','Capital','equity'),
 ('4.1.01','Ingresos por servicios','income'),('5.1.01','Costo de insumos','expense'),('5.1.02','Nómina y comisiones','expense')
on conflict(code) do nothing;

create or replace function janastudio.get_management_report(p_start timestamptz,p_end timestamptz)
returns jsonb language sql security definer set search_path=janastudio,pg_temp as $$
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(x order by completed desc) from (
      select category, count(*) completed, sum(revenue) revenue, sum(salon_profit) profit
      from janastudio.service_profit_snapshots where created_at>=p_start and created_at<p_end group by category) x),'[]'::jsonb),
    'promotions', coalesce((select jsonb_agg(x order by uses desc) from (
      select p.name,count(r.id) uses,coalesce(sum(r.discount_amount),0) discount,coalesce(sum(r.final_amount),0) revenue
      from janastudio.promotions p left join janastudio.promotion_redemptions r on r.promotion_id=p.id and r.created_at>=p_start and r.created_at<p_end group by p.id,p.name) x),'[]'::jsonb),
    'laser_receivable', coalesce((select sum(amount) from janastudio.package_installments where status='pending'),0),
    'laser_split', (select jsonb_build_object('worker',coalesce(sum(worker_amount),0),'partner',coalesce(sum(partner_supplies_amount-supplies_spent),0),'studio',coalesce(sum(studio_amount),0)) from janastudio.laser_revenue_allocations where created_at>=p_start and created_at<p_end),
    'inventory_variance', coalesce((select jsonb_agg(x) from (
      select i.name,c.expected_services,c.services_count,(c.services_count-c.expected_services) variance,c.status
      from janastudio.inventory_containers c join janastudio.inventory i on i.id=c.inventory_item_id) x),'[]'::jsonb)
  )
$$;

do $$ declare t text; begin
  foreach t in array array['staff_schedules','staff_time_off','schedule_blocks','promotions','promotion_redemptions',
    'inventory_containers','inventory_container_usage','chart_of_accounts','journal_entries','journal_lines',
    'bank_statement_lines','payables_receivables','laser_revenue_allocations'] loop
    execute format('alter table janastudio.%I enable row level security',t);
    execute format('drop policy if exists %I on janastudio.%I',t||'_staff',t);
    execute format('create policy %I on janastudio.%I for all to authenticated using (janastudio.is_active_staff()) with check (janastudio.is_active_staff())',t||'_staff',t);
    execute format('grant select,insert,update,delete on janastudio.%I to authenticated',t);
  end loop;
end $$;
grant execute on function janastudio.create_appointment_order(jsonb,jsonb) to authenticated;
grant execute on function janastudio.sell_laser_package(uuid,uuid,integer,numeric,text,text,numeric) to authenticated;
grant execute on function janastudio.pay_package_installment(uuid,text,numeric) to authenticated;
grant execute on function janastudio.get_management_report(timestamptz,timestamptz) to authenticated;
grant execute on function janastudio.post_journal_entry(jsonb,jsonb) to authenticated;

commit;
