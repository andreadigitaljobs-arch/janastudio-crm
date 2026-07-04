-- Egress optimization RPCs: shift heavy calculations from client to server.

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. get_barber_production_stats
-- Returns pre-calculated production stats per barber for the dashboard.
-- Handles both main barbers (via appointments.staff_id, using total_price)
-- and assistants (via appointment_staff, using commission_earned + product_commission + tip_amount).
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_barber_production_stats(p_start_date timestamptz)
returns table (
  staff_id uuid,
  total_monthly numeric,
  total_weekly numeric,
  total_today numeric,
  appointment_count bigint
)
language sql
stable
set search_path = public
as $$
  with appts as (
    select a.id, a.staff_id, a.total_price, a.created_at, a.scheduled_at
    from appointments a
    where a.status = 'Completado'
      and a.created_at >= p_start_date
      and a.service_id is not null
  ),
  main_barbers as (
    select
      a.staff_id,
      coalesce(sum(case when (a.created_at >= date_trunc('month', now()) or a.scheduled_at >= date_trunc('month', now())) then a.total_price end), 0) as total_monthly,
      coalesce(sum(case when (a.created_at >= date_trunc('week', now()) or a.scheduled_at >= date_trunc('week', now())) then a.total_price end), 0) as total_weekly,
      coalesce(sum(case when (a.created_at::date = current_date or a.scheduled_at::date = current_date) then a.total_price end), 0) as total_today,
      count(*) filter (where a.created_at::date = current_date or a.scheduled_at::date = current_date)::bigint as appointment_count
    from appts a
    where a.staff_id is not null
    group by a.staff_id
  ),
  assistants as (
    select
      astaff.staff_id,
      coalesce(sum(case when (a.created_at >= date_trunc('month', now()) or a.scheduled_at >= date_trunc('month', now())) then (coalesce(astaff.commission_earned, 0) + coalesce(astaff.product_commission, 0) + coalesce(astaff.tip_amount, 0)) end), 0) as total_monthly,
      coalesce(sum(case when (a.created_at >= date_trunc('week', now()) or a.scheduled_at >= date_trunc('week', now())) then (coalesce(astaff.commission_earned, 0) + coalesce(astaff.product_commission, 0) + coalesce(astaff.tip_amount, 0)) end), 0) as total_weekly,
      coalesce(sum(case when (a.created_at::date = current_date or a.scheduled_at::date = current_date) then (coalesce(astaff.commission_earned, 0) + coalesce(astaff.product_commission, 0) + coalesce(astaff.tip_amount, 0)) end), 0) as total_today,
      count(*) filter (where a.created_at::date = current_date or a.scheduled_at::date = current_date)::bigint as appointment_count
    from appts a
    join appointment_staff astaff on astaff.appointment_id = a.id
    where astaff.staff_id is not null
    group by astaff.staff_id
  )
  select
    coalesce(m.staff_id, a.staff_id) as staff_id,
    coalesce(m.total_monthly, 0) + coalesce(a.total_monthly, 0) as total_monthly,
    coalesce(m.total_weekly, 0) + coalesce(a.total_weekly, 0) as total_weekly,
    coalesce(m.total_today, 0) + coalesce(a.total_today, 0) as total_today,
    coalesce(m.appointment_count, 0) + coalesce(a.appointment_count, 0) as appointment_count
  from main_barbers m
  full join assistants a on a.staff_id = m.staff_id;
$$;

grant execute on function public.get_barber_production_stats(timestamptz) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. get_clients_with_stats
-- Returns clients with visit counts, total spent, and staff IDs served by.
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_clients_with_stats()
returns table (
  id uuid,
  name text,
  phone text,
  id_card text,
  created_at timestamptz,
  birth_date text,
  hair_type text,
  scalp_type text,
  active boolean,
  recurrence_enabled boolean,
  recurrence_days integer,
  recurrence_last_sent_at timestamptz,
  created_by_staff_id uuid,
  total_visits bigint,
  total_spent numeric,
  served_by_staff_ids uuid[]
)
language sql
stable
set search_path = public
as $$
  select
    c.id, c.name, c.phone, c.id_card, c.created_at,
    c.birth_date, c.hair_type, c.scalp_type, c.active,
    c.recurrence_enabled, c.recurrence_days, c.recurrence_last_sent_at,
    c.created_by_staff_id,
    count(a.id)::bigint as total_visits,
    coalesce(sum(a.total_price), 0) as total_spent,
    coalesce((
      select array(
        select distinct staff_id from (
          select a2.staff_id from appointments a2 where a2.client_id = c.id and a2.status in ('Completado', 'En Silla', 'Por Pagar') and a2.service_id is not null and a2.staff_id is not null
          union
          select astaff.staff_id from appointments a2 join appointment_staff astaff on astaff.appointment_id = a2.id where a2.client_id = c.id and a2.status in ('Completado', 'En Silla', 'Por Pagar') and a2.service_id is not null and astaff.staff_id is not null
        ) sub
      )
    ), '{}'::uuid[]) as served_by_staff_ids
  from clients c
  left join appointments a on a.client_id = c.id
    and a.status in ('Completado', 'En Silla', 'Por Pagar')
    and a.service_id is not null
  group by c.id
  order by c.created_at desc;
$$;

grant execute on function public.get_clients_with_stats() to authenticated;

commit;
