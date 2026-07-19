-- Add new fields to client_packages
alter table janastudio.client_packages
add column if not exists total_amount numeric(10,2) not null default 0,
add column if not exists expires_at timestamptz;

-- Create package_installments table
create table if not exists janastudio.package_installments (
  id uuid primary key default gen_random_uuid(),
  client_package_id uuid references janastudio.client_packages(id) on delete cascade,
  installment_number integer not null,
  amount numeric(10,2) not null,
  status text default 'pending', -- 'pending' | 'paid'
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Add supplies cost to package_sessions
alter table janastudio.package_sessions
add column if not exists supplies_cost numeric(10,2) not null default 0;

-- Grant permissions
grant select, insert, update, delete on janastudio.package_installments to anon, authenticated, authenticator;
