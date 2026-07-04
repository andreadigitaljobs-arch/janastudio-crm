-- AstroBarber authorization and transactional checkout hardening.
-- Apply from the Supabase SQL Editor in one operation.

begin;

alter table public.clients
  add column if not exists created_by_staff_id uuid references public.staff(id) on delete set null;
alter table public.appointments
  add column if not exists created_by_staff_id uuid references public.staff(id) on delete set null;
alter table public.transactions
  add column if not exists created_by_staff_id uuid references public.staff(id) on delete set null,
  add column if not exists idempotency_key uuid;
alter table public.inventory
  add column if not exists staff_id uuid references public.staff(id) on delete set null;
alter table public.inventory_movements
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

create unique index if not exists transactions_idempotency_key_uidx
  on public.transactions(idempotency_key) where idempotency_key is not null;
create index if not exists clients_created_by_idx on public.clients(created_by_staff_id);
create index if not exists appointments_created_by_idx on public.appointments(created_by_staff_id);
create index if not exists appointments_staff_idx on public.appointments(staff_id);
create index if not exists appointments_client_idx on public.appointments(client_id);
create index if not exists appointment_staff_staff_idx on public.appointment_staff(staff_id);
create index if not exists appointment_staff_appointment_idx on public.appointment_staff(appointment_id);
create index if not exists inventory_staff_idx on public.inventory(staff_id);

create or replace function public.current_staff_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.staff
  where auth_user_id = auth.uid()
    and coalesce(active, true)
    and coalesce(role, '') not like 'ARCHIVED|%'
  limit 1
$$;

create or replace function public.current_staff_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select btrim(split_part(coalesce(role, ''), '|', 1))
  from public.staff
  where auth_user_id = auth.uid()
    and coalesce(active, true)
    and coalesce(role, '') not like 'ARCHIVED|%'
  limit 1
$$;

create or replace function public.current_staff_kind()
returns text
language sql stable security definer
set search_path = public
as $$
  select case
    when lower(public.current_staff_role()) = 'admin' then 'admin'
    when lower(public.current_staff_role()) like '%recep%' then 'reception'
    when lower(public.current_staff_role()) like '%caja%' then 'cashier'
    when lower(public.current_staff_role()) like '%asistent%'
      or lower(public.current_staff_role()) like '%lavado%'
      or lower(public.current_staff_role()) like '%operaciones%' then 'assistant'
    when lower(public.current_staff_role()) like '%barber%'
      or lower(public.current_staff_role()) like '%barbero%' then 'barber'
    else 'other'
  end
$$;

create or replace function public.is_active_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$ select public.current_staff_id() is not null $$;

create or replace function public.can_access_appointment(p_appointment_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case
    when not public.is_active_staff() then false
    when public.current_staff_kind() in ('admin','reception','cashier','assistant') then true
    when public.current_staff_kind() = 'barber' then exists (
      select 1 from public.appointments a
      where a.id = p_appointment_id
        and (
          a.staff_id = public.current_staff_id()
          or a.created_by_staff_id = public.current_staff_id()
          or exists (
            select 1 from public.appointment_staff aps
            where aps.appointment_id = a.id
              and aps.staff_id = public.current_staff_id()
          )
        )
    )
    else false
  end
$$;

create or replace function public.can_access_client(p_client_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case
    when not public.is_active_staff() then false
    when public.current_staff_kind() in ('admin','reception','cashier','assistant') then true
    when public.current_staff_kind() = 'barber' then exists (
      select 1 from public.clients c
      where c.id = p_client_id
        and (
          c.created_by_staff_id = public.current_staff_id()
          or exists (
            select 1 from public.appointments a
            where a.client_id = c.id
              and (
                a.staff_id = public.current_staff_id()
                or a.created_by_staff_id = public.current_staff_id()
                or exists (
                  select 1 from public.appointment_staff aps
                  where aps.appointment_id = a.id
                    and aps.staff_id = public.current_staff_id()
                )
              )
          )
        )
    )
    else false
  end
$$;

alter table public.clients alter column created_by_staff_id set default public.current_staff_id();
alter table public.appointments alter column created_by_staff_id set default public.current_staff_id();
alter table public.transactions alter column created_by_staff_id set default public.current_staff_id();
alter table public.inventory alter column staff_id set default public.current_staff_id();

-- Remove every legacy policy, including old permissive policies with auth.uid() IS NOT NULL.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename = any(array[
      'staff','clients','appointments','appointment_staff','appointment_extras',
      'appointment_products','transactions','inventory','inventory_movements',
      'services','service_extras','service_checklist_items','notifications'
    ])
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.staff enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_staff enable row level security;
alter table public.appointment_extras enable row level security;
alter table public.appointment_products enable row level security;
alter table public.transactions enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.services enable row level security;
alter table public.service_extras enable row level security;
alter table public.service_checklist_items enable row level security;
alter table public.notifications enable row level security;

-- Staff: all active employees need the directory; only Admin manages other rows.
create policy staff_select_active on public.staff for select to authenticated
using (public.is_active_staff() and coalesce(role, '') not like 'ARCHIVED|%');
create policy staff_update_admin_or_self on public.staff for update to authenticated
using (public.current_staff_kind() = 'admin' or id = public.current_staff_id())
with check (public.current_staff_kind() = 'admin' or id = public.current_staff_id());
create policy staff_insert_admin on public.staff for insert to authenticated
with check (public.current_staff_kind() = 'admin');
create policy staff_delete_admin on public.staff for delete to authenticated
using (public.current_staff_kind() = 'admin');

-- Stop a user from escalating privileges by editing their own staff row.
create or replace function public.protect_staff_sensitive_fields()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.current_staff_kind() <> 'admin' and (
    new.role is distinct from old.role
    or new.email is distinct from old.email
    or new.auth_user_id is distinct from old.auth_user_id
    or new.commission_pct is distinct from old.commission_pct
    or new.washing_rate is distinct from old.washing_rate
    or new.active is distinct from old.active
    or new.username is distinct from old.username
    or new.password is distinct from old.password
  ) then
    raise exception 'Only Admin can update protected staff fields';
  end if;
  return new;
end
$$;
drop trigger if exists protect_staff_sensitive_fields_trigger on public.staff;
create trigger protect_staff_sensitive_fields_trigger
before update on public.staff for each row
execute function public.protect_staff_sensitive_fields();
-- Clients: assistants/operations see all; barbers only clients they created or served.
create policy clients_select_matrix on public.clients for select to authenticated
using (public.can_access_client(id));
create policy clients_insert_matrix on public.clients for insert to authenticated
with check (public.is_active_staff() and created_by_staff_id = public.current_staff_id());
create policy clients_update_matrix on public.clients for update to authenticated
using (public.can_access_client(id)) with check (public.can_access_client(id));
create policy clients_delete_admin on public.clients for delete to authenticated
using (public.current_staff_kind() = 'admin');

-- Appointments: assistant/reception/cashier see all; barbers only assigned/created.
create policy appointments_select_matrix on public.appointments for select to authenticated
using (public.can_access_appointment(id));
create policy appointments_insert_matrix on public.appointments for insert to authenticated
with check (public.is_active_staff() and created_by_staff_id = public.current_staff_id());
create policy appointments_update_matrix on public.appointments for update to authenticated
using (public.can_access_appointment(id)) with check (public.can_access_appointment(id));
create policy appointments_delete_ops on public.appointments for delete to authenticated
using (public.current_staff_kind() in ('admin','reception'));

create policy appointment_staff_select_matrix on public.appointment_staff for select to authenticated
using (public.can_access_appointment(appointment_id));
create policy appointment_staff_write_matrix on public.appointment_staff for all to authenticated
using (public.can_access_appointment(appointment_id))
with check (public.can_access_appointment(appointment_id));
create policy appointment_extras_matrix on public.appointment_extras for all to authenticated
using (public.can_access_appointment(appointment_id))
with check (public.can_access_appointment(appointment_id));
create policy appointment_products_matrix on public.appointment_products for all to authenticated
using (public.can_access_appointment(appointment_id))
with check (public.can_access_appointment(appointment_id));

-- Finance: Admin sees all; everyone else only records created by or involving them.
create policy transactions_select_matrix on public.transactions for select to authenticated
using (
  public.current_staff_kind() = 'admin'
  or (
    public.current_staff_kind() in ('cashier','barber','assistant')
    and (
      created_by_staff_id = public.current_staff_id()
      or staff_id = public.current_staff_id()
      or exists (
        select 1 from jsonb_array_elements(
          case when jsonb_typeof(metadata->'staffInvolved') = 'array'
            then metadata->'staffInvolved' else '[]'::jsonb end
        ) member
        where member->>'staffId' = public.current_staff_id()::text
      )
    )
  )
);
create policy transactions_insert_matrix on public.transactions for insert to authenticated
with check (public.is_active_staff() and created_by_staff_id = public.current_staff_id());
create policy transactions_update_admin on public.transactions for update to authenticated
using (public.current_staff_kind() = 'admin') with check (public.current_staff_kind() = 'admin');
create policy transactions_delete_admin on public.transactions for delete to authenticated
using (public.current_staff_kind() = 'admin');

-- Inventory: Admin/Caja see and manage all. Others only their assigned inventory.
create policy inventory_select_matrix on public.inventory for select to authenticated
using (
  public.current_staff_kind() in ('admin','reception','cashier','assistant')
  or staff_id = public.current_staff_id()
  or exists (
    select 1 from public.appointment_products ap
    where ap.product_id = inventory.id and public.can_access_appointment(ap.appointment_id)
  )
);
create policy inventory_insert_ops on public.inventory for insert to authenticated
with check (
  public.is_active_staff()
  and (public.current_staff_kind() in ('admin','cashier') or staff_id = public.current_staff_id())
);
create policy inventory_update_matrix on public.inventory for update to authenticated
using (public.current_staff_kind() in ('admin','cashier') or staff_id = public.current_staff_id())
with check (public.current_staff_kind() in ('admin','cashier') or staff_id = public.current_staff_id());
create policy inventory_delete_ops on public.inventory for delete to authenticated
using (public.current_staff_kind() in ('admin','cashier'));

create policy inventory_movements_select_matrix on public.inventory_movements for select to authenticated
using (public.current_staff_kind() in ('admin','cashier') or staff_id = public.current_staff_id());
create policy inventory_movements_insert_matrix on public.inventory_movements for insert to authenticated
with check (public.is_active_staff() and coalesce(staff_id, public.current_staff_id()) = public.current_staff_id());
create policy inventory_movements_update_ops on public.inventory_movements for update to authenticated
using (public.current_staff_kind() in ('admin','cashier'))
with check (public.current_staff_kind() in ('admin','cashier'));
create policy inventory_movements_delete_ops on public.inventory_movements for delete to authenticated
using (public.current_staff_kind() in ('admin','cashier'));

-- Catalog/configuration is readable by active staff, writable only by Admin.
create policy services_select_staff on public.services for select to authenticated using (public.is_active_staff());
create policy services_write_admin on public.services for all to authenticated
using (public.current_staff_kind() = 'admin') with check (public.current_staff_kind() = 'admin');
create policy extras_select_staff on public.service_extras for select to authenticated using (public.is_active_staff());
create policy extras_write_admin on public.service_extras for all to authenticated
using (public.current_staff_kind() = 'admin') with check (public.current_staff_kind() = 'admin');
create policy checklist_select_staff on public.service_checklist_items for select to authenticated using (public.is_active_staff());
create policy checklist_write_admin on public.service_checklist_items for all to authenticated
using (public.current_staff_kind() = 'admin') with check (public.current_staff_kind() = 'admin');
create policy notifications_staff on public.notifications for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());

-- Read-only sales catalog for checkout. It excludes cost and supplier information.
create or replace function public.get_sale_inventory_catalog()
returns table (
  id uuid, name text, category text, stock numeric, price numeric,
  commission_pct numeric, is_for_sale boolean, image_url text, staff_id uuid
)
language sql stable security definer
set search_path = public
as $$
  select i.id, i.name, i.category, i.stock, i.price, i.commission_pct,
         i.is_for_sale, i.image_url, i.staff_id
  from public.inventory i
  where public.is_active_staff() and coalesce(i.is_for_sale, true)
  order by i.name
$$;

-- Atomic and idempotent database portion of checkout.
create or replace function public.process_checkout_atomic(
  p_payment jsonb,
  p_idempotency_key uuid
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_transaction_id uuid;
  v_primary_appointment uuid;
  v_appointment_id uuid;
  v_staff jsonb;
  v_product jsonb;
  v_quantity numeric;
begin
  if not public.is_active_staff() then raise exception 'Unauthorized'; end if;
  if p_idempotency_key is null then raise exception 'Missing idempotency key'; end if;

  select id into v_existing from public.transactions
  where idempotency_key = p_idempotency_key limit 1;
  if v_existing is not null then return v_existing; end if;

  v_primary_appointment := nullif(coalesce(
    p_payment->>'appointmentId', p_payment->'appointmentIds'->>0
  ), '')::uuid;

  for v_appointment_id in
    select value::uuid from jsonb_array_elements_text(coalesce(p_payment->'appointmentIds','[]'::jsonb))
  loop
    if not public.can_access_appointment(v_appointment_id) then raise exception 'Appointment access denied'; end if;
    update public.appointments set status='Completado', completed_at=now() where id=v_appointment_id;
  end loop;
  if jsonb_array_length(coalesce(p_payment->'appointmentIds','[]'::jsonb)) = 0 and v_primary_appointment is not null then
    if not public.can_access_appointment(v_primary_appointment) then raise exception 'Appointment access denied'; end if;
    update public.appointments set status='Completado', completed_at=now() where id=v_primary_appointment;
  end if;

  if v_primary_appointment is not null then
    delete from public.appointment_staff
    where appointment_id in (
      select value::uuid from jsonb_array_elements_text(
        case when jsonb_array_length(coalesce(p_payment->'appointmentIds','[]'::jsonb)) > 0
          then p_payment->'appointmentIds' else jsonb_build_array(v_primary_appointment) end
      )
    );
    for v_staff in select value from jsonb_array_elements(coalesce(p_payment->'staffInvolved','[]'::jsonb))
    loop
      if nullif(v_staff->>'staffId','') is not null then
        insert into public.appointment_staff(appointment_id,staff_id,commission_earned,product_commission,tip_amount)
        values (v_primary_appointment,(v_staff->>'staffId')::uuid,
          coalesce((v_staff->>'commissionEarned')::numeric,0),
          coalesce((v_staff->>'productCommissionEarned')::numeric,0),
          coalesce((v_staff->>'tip')::numeric,0));
      end if;
    end loop;
  end if;

  for v_product in select value from jsonb_array_elements(coalesce(p_payment->'products','[]'::jsonb))
  loop
    v_quantity := greatest(coalesce((v_product->>'quantity')::numeric,1),0);
    update public.inventory set stock=stock-v_quantity, updated_at=now()
    where id=(v_product->>'id')::uuid and stock>=v_quantity;
    if not found then raise exception 'Insufficient inventory for product %', v_product->>'id'; end if;
    insert into public.inventory_movements(product_id,type,amount,reason,staff_id)
    values ((v_product->>'id')::uuid,'exit',v_quantity,
      'Venta - Cliente: ' || coalesce(p_payment->>'clientName','Cliente'),public.current_staff_id());
  end loop;

  insert into public.transactions(
    description,amount,type,category,exchange_rate,currency,metadata,
    created_at,created_by_staff_id,idempotency_key,client_id
  ) values (
    case when v_primary_appointment is not null
      then 'VENTA FINAL - Cliente: ' || coalesce(p_payment->>'clientName','Cliente')
      else 'VENTA DIRECTA PRODUCTOS - Cliente: ' || coalesce(p_payment->>'clientName','Cliente') end,
    coalesce((p_payment->>'totalUsd')::numeric,0),'income','Ventas Astro',
    coalesce((p_payment->>'fixedRate')::numeric,0),'USD',
    p_payment || jsonb_build_object(
      'appointment_id', v_primary_appointment,
      'client_id', nullif(p_payment->>'clientId','')::uuid,
      'mixed_payment', coalesce((p_payment->>'isMixed')::boolean, false),
      'cash_usd', coalesce((p_payment->>'cashUsd')::numeric, 0),
      'transfer_bs', coalesce((p_payment->>'transferBs')::numeric, 0),
      'tips_total', coalesce((p_payment->>'totalTips')::numeric, 0),
      'method_usd', p_payment->>'methodUsd',
      'method_bs', p_payment->>'methodBs',
      'products_sold', coalesce(p_payment->'products', '[]'::jsonb)
    ),
    now(),public.current_staff_id(),p_idempotency_key,nullif(p_payment->>'clientId','')::uuid
  ) returning id into v_transaction_id;

  return v_transaction_id;
exception when unique_violation then
  select id into v_existing from public.transactions where idempotency_key=p_idempotency_key;
  return v_existing;
end
$$;

revoke all on all tables in schema public from anon;
revoke all on public.staff, public.clients, public.appointments,
  public.appointment_staff, public.appointment_extras, public.appointment_products,
  public.transactions, public.inventory, public.inventory_movements,
  public.services, public.service_extras, public.service_checklist_items,
  public.notifications from authenticated;
grant insert, update, delete on public.staff to authenticated;
revoke select on public.staff from authenticated;
grant select (
  id, auth_user_id, email, name, role, commission_pct, active, created_at,
  image_url, phone, address, tools, washing_rate, birth_date
) on public.staff to authenticated;
grant select, insert, update, delete on public.clients, public.appointments,
  public.appointment_staff, public.appointment_extras, public.appointment_products,
  public.transactions, public.inventory, public.inventory_movements,
  public.services, public.service_extras, public.service_checklist_items,
  public.notifications to authenticated;
revoke all on function public.current_staff_id() from public, anon;
revoke all on function public.current_staff_role() from public, anon;
revoke all on function public.current_staff_kind() from public, anon;
revoke all on function public.is_active_staff() from public, anon;
revoke all on function public.can_access_appointment(uuid) from public, anon;
revoke all on function public.can_access_client(uuid) from public, anon;
revoke all on function public.get_sale_inventory_catalog() from public, anon;
revoke all on function public.process_checkout_atomic(jsonb,uuid) from public, anon;
grant execute on function public.current_staff_id() to authenticated;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.current_staff_kind() to authenticated;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.can_access_appointment(uuid) to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;
grant execute on function public.get_sale_inventory_catalog() to authenticated;
grant execute on function public.process_checkout_atomic(jsonb,uuid) to authenticated;

commit;
