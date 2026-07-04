-- Server-side client creation for staff users.
-- This avoids direct browser INSERTs being blocked by clients RLS while keeping
-- creator attribution controlled by the database.

begin;

create or replace function public.create_client_for_staff(p_client jsonb)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid;
  v_client public.clients;
  v_birth_date date;
  v_recurrence_days integer;
begin
  v_staff_id := public.current_staff_id();

  if v_staff_id is null then
    raise exception 'Authenticated user is not linked to active staff'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_client->>'name', '')), '') is null then
    raise exception 'Client name is required'
      using errcode = '23502';
  end if;

  if nullif(btrim(coalesce(p_client->>'birth_date', '')), '') is not null then
    v_birth_date := (p_client->>'birth_date')::date;
  end if;

  if nullif(btrim(coalesce(p_client->>'recurrence_days', '')), '') is not null then
    v_recurrence_days := (p_client->>'recurrence_days')::integer;
  end if;

  insert into public.clients (
    name,
    phone,
    id_card,
    birth_date,
    hair_type,
    scalp_type,
    created_at,
    created_by_staff_id,
    active,
    recurrence_enabled,
    recurrence_days
  ) values (
    btrim(p_client->>'name'),
    nullif(btrim(coalesce(p_client->>'phone', '')), ''),
    nullif(btrim(coalesce(p_client->>'id_card', '')), ''),
    v_birth_date,
    coalesce(nullif(btrim(coalesce(p_client->>'hair_type', '')), ''), 'Normal'),
    coalesce(nullif(btrim(coalesce(p_client->>'scalp_type', '')), ''), 'Normal'),
    coalesce((p_client->>'created_at')::timestamptz, now()),
    v_staff_id,
    coalesce((p_client->>'active')::boolean, true),
    coalesce((p_client->>'recurrence_enabled')::boolean, false),
    v_recurrence_days
  )
  returning * into v_client;

  return v_client;
end;
$$;

grant execute on function public.create_client_for_staff(jsonb) to authenticated;

commit;
