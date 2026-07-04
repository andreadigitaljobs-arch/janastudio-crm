-- Fix: get_clients_with_stats needs SECURITY DEFINER so it can join
-- appointments table even when RLS would block the user from querying it directly.
-- Without this, the function fails silently for authenticated users.

CREATE OR REPLACE FUNCTION public.get_clients_with_stats()
RETURNS TABLE (
  id UUID, name TEXT, phone TEXT, id_card TEXT, created_at TIMESTAMPTZ,
  birth_date TEXT, hair_type TEXT, scalp_type TEXT, active BOOLEAN,
  recurrence_enabled BOOLEAN, recurrence_days SMALLINT, recurrence_last_sent_at TIMESTAMPTZ,
  created_by_staff_id UUID, total_visits BIGINT, total_spent NUMERIC,
  served_by_staff_ids UUID[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.name, c.phone, c.id_card, c.created_at,
    c.birth_date, c.hair_type, c.scalp_type, c.active,
    c.recurrence_enabled, c.recurrence_days, c.recurrence_last_sent_at,
    c.created_by_staff_id,
    count(a.id)::bigint AS total_visits,
    coalesce(sum(a.total_price), 0) AS total_spent,
    coalesce((
      SELECT array(
        SELECT DISTINCT staff_id FROM (
          SELECT a2.staff_id FROM appointments a2 WHERE a2.client_id = c.id AND a2.status != 'Cancelada' AND a2.staff_id IS NOT NULL
          UNION
          SELECT astaff.staff_id FROM appointments a2 JOIN appointment_staff astaff ON astaff.appointment_id = a2.id WHERE a2.client_id = c.id AND a2.status != 'Cancelada' AND astaff.staff_id IS NOT NULL
        ) sub
      )
    ), '{}'::uuid[]) AS served_by_staff_ids
  FROM clients c
  LEFT JOIN appointments a ON a.client_id = c.id
    AND a.status IN ('Completado', 'En Silla', 'Por Pagar')
    AND a.service_id IS NOT NULL
  GROUP BY c.id
  ORDER BY c.created_at DESC;
$$;
