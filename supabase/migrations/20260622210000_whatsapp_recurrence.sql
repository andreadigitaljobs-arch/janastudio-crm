-- WhatsApp recurrence preferences, templates and reliable reminder queue.
begin;

create extension if not exists pgcrypto;

alter table public.clients
  add column if not exists active boolean not null default true,
  add column if not exists recurrence_enabled boolean not null default false,
  add column if not exists recurrence_days smallint,
  add column if not exists recurrence_last_sent_at timestamptz;

alter table public.clients drop constraint if exists clients_recurrence_days_check;
alter table public.clients add constraint clients_recurrence_days_check
  check (recurrence_days is null or recurrence_days between 1 and 365);

create table if not exists public.system_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.staff(id) on delete set null
);
alter table public.system_settings add column if not exists updated_at timestamptz not null default now();
alter table public.system_settings add column if not exists updated_by uuid references public.staff(id) on delete set null;

create table if not exists public.scheduled_reminders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  kind text not null default 'recurrence',
  remind_at timestamptz not null,
  sent boolean not null default false,
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
alter table public.scheduled_reminders add column if not exists kind text not null default 'recurrence';
alter table public.scheduled_reminders add column if not exists sent_at timestamptz;
alter table public.scheduled_reminders add column if not exists attempts integer not null default 0;
alter table public.scheduled_reminders add column if not exists last_error text;
alter table public.scheduled_reminders add column if not exists created_at timestamptz not null default now();

create index if not exists scheduled_reminders_pending_idx
  on public.scheduled_reminders (sent, remind_at);
create unique index if not exists scheduled_reminders_one_pending_per_client_idx
  on public.scheduled_reminders (client_id, kind) where sent = false;

insert into public.system_settings (key, value) values
  ('whatsapp_template_birthday', 'Hola {{nombre}}! Te deseamos un feliz cumpleanos de parte de Astro Barbershop.'),
  ('whatsapp_template_followup', 'Hola {{nombre}}! Ya es momento de renovar tu corte. Te esperamos en Astro Barbershop.'),
  ('whatsapp_template_welcome', 'Hola {{nombre}}! Bienvenido a Astro Barbershop.'),
  ('whatsapp_template_appointment', 'Hola {{nombre}}! Tu cita quedo agendada para el {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Barbero: {{barbero}}.')
on conflict (key) do nothing;

create or replace function public.queue_client_recurrence_reminder()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_completed_at timestamptz;
begin
  if new.status is distinct from 'Completado'
     or (tg_op = 'UPDATE' and old.status is not distinct from 'Completado')
     or new.client_id is null then
    return new;
  end if;

  select * into v_client from public.clients where id = new.client_id;
  if not coalesce(v_client.active, true)
     or not coalesce(v_client.recurrence_enabled, false)
     or v_client.recurrence_days is null then
    return new;
  end if;

  v_completed_at := coalesce(new.completed_at, now());
  insert into public.scheduled_reminders (client_id, appointment_id, kind, remind_at, sent)
  values (
    new.client_id,
    new.id,
    'recurrence',
    v_completed_at + make_interval(days => v_client.recurrence_days),
    false
  )
  on conflict (client_id, kind) where sent = false
  do update set
    appointment_id = excluded.appointment_id,
    remind_at = excluded.remind_at,
    attempts = 0,
    last_error = null;

  return new;
end
$$;

drop trigger if exists queue_client_recurrence_reminder_trigger on public.appointments;
create trigger queue_client_recurrence_reminder_trigger
after insert or update of status on public.appointments
for each row execute function public.queue_client_recurrence_reminder();

alter table public.system_settings enable row level security;
alter table public.scheduled_reminders enable row level security;

drop policy if exists system_settings_select_staff on public.system_settings;
drop policy if exists system_settings_write_staff on public.system_settings;
create policy system_settings_select_staff on public.system_settings for select to authenticated
using (public.is_active_staff());
create policy system_settings_write_staff on public.system_settings for all to authenticated
using (
  public.is_active_staff() and key in ('whatsapp_template_birthday','whatsapp_template_followup','whatsapp_template_welcome','whatsapp_template_appointment')
)
with check (
  public.is_active_staff() and key in ('whatsapp_template_birthday','whatsapp_template_followup','whatsapp_template_welcome','whatsapp_template_appointment')
);

do $$
begin
  alter publication supabase_realtime add table public.clients;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.appointments;
exception when duplicate_object then null;
end $$;

-- The queue is private. The bot uses service_role, which bypasses RLS.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'scheduled_reminders'
  loop
    execute format('drop policy if exists %I on public.scheduled_reminders', p.policyname);
  end loop;
end $$;

commit;
