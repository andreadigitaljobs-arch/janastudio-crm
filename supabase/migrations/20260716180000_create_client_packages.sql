-- Create client_packages and package_sessions tables in janastudio schema
-- if they don't already exist, and grant appropriate permissions.

create table if not exists janastudio.client_packages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references janastudio.clients(id) on delete cascade,
  service_id uuid references janastudio.services(id) on delete set null,
  total_sessions integer not null default 8,
  used_sessions integer not null default 0,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists janastudio.package_sessions (
  id uuid primary key default gen_random_uuid(),
  client_package_id uuid references janastudio.client_packages(id) on delete cascade,
  appointment_id uuid references janastudio.appointments(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

-- Grant permissions to PostgREST roles
grant select, insert, update, delete on janastudio.client_packages to anon, authenticated, authenticator;
grant select, insert, update, delete on janastudio.package_sessions to anon, authenticated, authenticator;
