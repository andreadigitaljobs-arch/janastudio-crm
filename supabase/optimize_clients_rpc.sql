-- Función para obtener clientes con estadísticas agregadas de visitas y dinero gastado
-- Esto evita descargar la tabla entera de citas (appointments) al cliente frontend.

DROP FUNCTION IF EXISTS get_clients_with_stats();

CREATE OR REPLACE FUNCTION get_clients_with_stats()
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    id_card TEXT,
    created_at TIMESTAMPTZ,
    birth_date TEXT,
    hair_type TEXT,
    scalp_type TEXT,
    active BOOLEAN,
    recurrence_enabled BOOLEAN,
    recurrence_days INTEGER,
    recurrence_last_sent_at TIMESTAMPTZ,
    created_by_staff_id UUID,
    total_visits BIGINT,
    total_spent NUMERIC,
    served_by_staff_ids UUID[]
) AS $$
BEGIN
    RETURN QUERY
    WITH client_stats AS (
        SELECT 
            a.client_id,
            COUNT(DISTINCT a.id) AS total_visits,
            SUM(a.total_price) AS total_spent,
            ARRAY_AGG(DISTINCT s_ids.staff_id) FILTER (WHERE s_ids.staff_id IS NOT NULL) AS served_by_staff_ids
        FROM appointments a
        LEFT JOIN LATERAL (
            SELECT staff_id FROM appointment_staff WHERE appointment_id = a.id
            UNION
            SELECT a.staff_id
        ) s_ids ON true
        WHERE a.status IN ('Completado', 'En Silla', 'Por Pagar')
          AND a.service_id IS NOT NULL
        GROUP BY a.client_id
    )
    SELECT 
        c.id, c.name, c.phone, c.id_card, c.created_at, c.birth_date, c.hair_type, c.scalp_type,
        c.active, c.recurrence_enabled, c.recurrence_days, c.recurrence_last_sent_at, c.created_by_staff_id,
        COALESCE(cs.total_visits, 0) AS total_visits,
        COALESCE(cs.total_spent, 0) AS total_spent,
        COALESCE(cs.served_by_staff_ids, ARRAY[]::UUID[]) AS served_by_staff_ids
    FROM clients c
    LEFT JOIN client_stats cs ON c.id = cs.client_id
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
