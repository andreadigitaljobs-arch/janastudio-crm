-- AstroBarber VPS performance indexes.
-- Scope: astrobarber schema only. Do not create project objects in public.

create index if not exists appointments_status_scheduled_idx
  on astrobarber.appointments (status, scheduled_at desc);

create index if not exists appointments_status_created_idx
  on astrobarber.appointments (status, created_at desc);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'astrobarber'
      and table_name = 'appointments'
      and column_name = 'accounting_at'
  ) then
    create index if not exists appointments_accounting_idx
      on astrobarber.appointments (accounting_at desc)
      where accounting_at is not null;
  end if;
end $$;

create index if not exists appointments_completed_idx
  on astrobarber.appointments (completed_at desc)
  where completed_at is not null;

create index if not exists appointment_extras_appointment_idx
  on astrobarber.appointment_extras (appointment_id);

create index if not exists appointment_extras_extra_idx
  on astrobarber.appointment_extras (extra_id);

create index if not exists appointment_products_appointment_idx
  on astrobarber.appointment_products (appointment_id);

create index if not exists appointment_products_product_idx
  on astrobarber.appointment_products (product_id);

create index if not exists transactions_created_idx
  on astrobarber.transactions (created_at desc);

create index if not exists transactions_type_created_idx
  on astrobarber.transactions (type, created_at desc);

create index if not exists transactions_client_idx
  on astrobarber.transactions (client_id);

create index if not exists transactions_metadata_gin_idx
  on astrobarber.transactions using gin (metadata jsonb_path_ops);

create index if not exists clients_created_idx
  on astrobarber.clients (created_at desc);

create index if not exists clients_id_card_idx
  on astrobarber.clients (id_card)
  where id_card is not null;

create index if not exists staff_auth_user_idx
  on astrobarber.staff (auth_user_id)
  where auth_user_id is not null;

create index if not exists services_name_idx
  on astrobarber.services (name);

analyze astrobarber.appointments;
analyze astrobarber.appointment_extras;
analyze astrobarber.appointment_products;
analyze astrobarber.transactions;
analyze astrobarber.clients;
analyze astrobarber.staff;
analyze astrobarber.services;
