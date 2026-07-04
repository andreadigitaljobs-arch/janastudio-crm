-- =====================================================
-- JanaStudio CRM - Schema completo para salón de belleza
-- Esquema: janastudio (Multi-Tenant)
-- Ejecutar este SQL PRIMERO en el SQL Editor del proyecto
-- =====================================================

-- Crear esquema dedicado
CREATE SCHEMA IF NOT EXISTS janastudio;

-- Extensions (en public schema - compartido)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- TABLAS BASE (Esquema janastudio)
-- =====================================================

CREATE TABLE IF NOT EXISTS janastudio.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID,
  email TEXT,
  name TEXT NOT NULL,
  role TEXT,
  commission_pct NUMERIC DEFAULT 40,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  image_url TEXT,
  phone TEXT,
  address TEXT,
  specialties JSONB,
  birth_date TEXT,
  username TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS janastudio.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  id_card TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  birth_date TEXT,
  skin_type TEXT DEFAULT 'Normal',
  nail_type TEXT DEFAULT 'Normal',
  allergies TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_by_staff_id UUID REFERENCES janastudio.staff(id) ON DELETE SET NULL,
  photo_url TEXT
);

CREATE TABLE IF NOT EXISTS janastudio.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  category TEXT,
  commission_pct NUMERIC DEFAULT 40,
  description TEXT,
  image_url TEXT,
  base_cost NUMERIC DEFAULT 0,
  variable_cost NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS janastudio.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  stock NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'unidad',
  is_for_sale BOOLEAN DEFAULT true,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  min_stock NUMERIC DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS janastudio.service_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES janastudio.services(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES janastudio.inventory(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity_per_service NUMERIC DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'unidad',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS janastudio.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES janastudio.clients(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES janastudio.staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES janastudio.services(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Agendado',
  total_price NUMERIC DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  exchange_rate NUMERIC,
  notes TEXT,
  created_by_staff_id UUID REFERENCES janastudio.staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS janastudio.appointment_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES janastudio.appointments(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES janastudio.staff(id) ON DELETE SET NULL,
  commission_earned NUMERIC DEFAULT 0,
  tip_amount NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS janastudio.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT,
  amount NUMERIC DEFAULT 0,
  type TEXT CHECK (type IN ('income', 'expense')),
  category TEXT,
  date DATE DEFAULT current_date,
  time TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'completed',
  reference TEXT,
  exchange_rate NUMERIC DEFAULT 1,
  currency TEXT DEFAULT 'USD',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by_staff_id UUID REFERENCES janastudio.staff(id) ON DELETE SET NULL,
  idempotency_key UUID UNIQUE,
  client_id UUID REFERENCES janastudio.clients(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES janastudio.staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS janastudio.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES janastudio.inventory(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('entry', 'exit', 'adjustment')),
  amount NUMERIC DEFAULT 0,
  reason TEXT,
  staff_id UUID REFERENCES janastudio.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS janastudio.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  link TEXT,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS janastudio.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES janastudio.staff(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS transactions_idempotency_key_uidx
  ON janastudio.transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS clients_created_by_idx ON janastudio.clients(created_by_staff_id);
CREATE INDEX IF NOT EXISTS appointments_created_by_idx ON janastudio.appointments(created_by_staff_id);
CREATE INDEX IF NOT EXISTS appointments_staff_idx ON janastudio.appointments(staff_id);
CREATE INDEX IF NOT EXISTS appointments_client_idx ON janastudio.appointments(client_id);
CREATE INDEX IF NOT EXISTS appointment_staff_staff_idx ON janastudio.appointment_staff(staff_id);
CREATE INDEX IF NOT EXISTS appointment_staff_appointment_idx ON janastudio.appointment_staff(appointment_id);
CREATE INDEX IF NOT EXISTS inventory_staff_idx ON janastudio.inventory(id);
CREATE INDEX IF NOT EXISTS service_costs_service_idx ON janastudio.service_costs(service_id);

-- =====================================================
-- FUNCIONES HELPER (Esquema janastudio)
-- =====================================================

CREATE OR REPLACE FUNCTION janastudio.current_staff_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = janastudio
AS $$
  SELECT id FROM janastudio.staff
  WHERE auth_user_id = auth.uid()
    AND coalesce(active, true)
    AND coalesce(role, '') NOT LIKE 'ARCHIVED|%'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION janastudio.current_staff_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = janastudio
AS $$
  SELECT btrim(split_part(coalesce(role, ''), '|', 1))
  FROM janastudio.staff
  WHERE auth_user_id = auth.uid()
    AND coalesce(active, true)
    AND coalesce(role, '') NOT LIKE 'ARCHIVED|%'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION janastudio.current_staff_kind()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = janastudio
AS $$
  SELECT case
    when lower(janastudio.current_staff_role()) = 'admin' then 'admin'
    when lower(janastudio.current_staff_role()) like '%recep%' then 'reception'
    when lower(janastudio.current_staff_role()) like '%caja%' then 'cashier'
    when lower(janastudio.current_staff_role()) like '%manicurista%'
      or lower(janastudio.current_staff_role()) like '%lashista%'
      or lower(janastudio.current_staff_role()) like '%estilista%'
      or lower(janastudio.current_staff_role()) like '%trabajador%' then 'worker'
    else 'other'
  end
$$;

CREATE OR REPLACE FUNCTION janastudio.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = janastudio
AS $$ SELECT janastudio.current_staff_id() IS NOT NULL $$;

CREATE OR REPLACE FUNCTION janastudio.can_access_appointment(p_appointment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = janastudio
AS $$
  SELECT case
    when not janastudio.is_active_staff() then false
    when janastudio.current_staff_kind() in ('admin','reception','cashier') then true
    when janastudio.current_staff_kind() = 'worker' then exists (
      SELECT 1 FROM janastudio.appointments a
      WHERE a.id = p_appointment_id
        AND (
          a.staff_id = janastudio.current_staff_id()
          or a.created_by_staff_id = janastudio.current_staff_id()
        )
    )
    else false
  end
$$;

CREATE OR REPLACE FUNCTION janastudio.can_access_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = janastudio
AS $$
  SELECT case
    when not janastudio.is_active_staff() then false
    when janastudio.current_staff_kind() in ('admin','reception','cashier') then true
    when janastudio.current_staff_kind() = 'worker' then exists (
      SELECT 1 FROM janastudio.clients c
      WHERE c.id = p_client_id
        AND (
          c.created_by_staff_id = janastudio.current_staff_id()
          or exists (
            SELECT 1 FROM janastudio.appointments a
            WHERE a.client_id = c.id
              AND a.staff_id = janastudio.current_staff_id()
          )
        )
    )
    else false
  end
$$;

-- =====================================================
-- FUNCIONES RPC
-- =====================================================

CREATE OR REPLACE FUNCTION janastudio.get_clients_with_stats()
RETURNS TABLE (
  id UUID, name TEXT, phone TEXT, id_card TEXT, created_at TIMESTAMPTZ,
  birth_date TEXT, skin_type TEXT, nail_type TEXT, allergies TEXT, notes TEXT,
  active BOOLEAN, created_by_staff_id UUID, photo_url TEXT,
  total_visits BIGINT, total_spent NUMERIC
)
LANGUAGE sql STABLE
SET search_path = janastudio
AS $$
  SELECT
    c.id, c.name, c.phone, c.id_card, c.created_at,
    c.birth_date, c.skin_type, c.nail_type, c.allergies, c.notes,
    c.active, c.created_by_staff_id, c.photo_url,
    count(a.id)::bigint AS total_visits,
    coalesce(sum(a.total_price), 0) AS total_spent
  FROM janastudio.clients c
  LEFT JOIN janastudio.appointments a ON a.client_id = c.id
    AND a.status IN ('Completado')
    AND a.service_id IS NOT NULL
  GROUP BY c.id
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION janastudio.get_worker_stats(p_start_date TIMESTAMPTZ)
RETURNS TABLE (
  staff_id UUID, name TEXT, total_monthly NUMERIC, total_weekly NUMERIC,
  total_today NUMERIC, appointment_count BIGINT
)
LANGUAGE sql STABLE
SET search_path = janastudio
AS $$
  SELECT
    s.id AS staff_id,
    s.name,
    coalesce(sum(CASE WHEN a.completed_at >= date_trunc('month', now()) THEN a.total_price END), 0) AS total_monthly,
    coalesce(sum(CASE WHEN a.completed_at >= date_trunc('week', now()) THEN a.total_price END), 0) AS total_weekly,
    coalesce(sum(CASE WHEN a.completed_at::date = current_date THEN a.total_price END), 0) AS total_today,
    count(*) FILTER (WHERE a.completed_at::date = current_date)::bigint AS appointment_count
  FROM janastudio.staff s
  LEFT JOIN janastudio.appointments a ON a.staff_id = s.id AND a.status = 'Completado'
  WHERE s.active = true
  GROUP BY s.id, s.name
  ORDER BY total_monthly DESC;
$$;

CREATE OR REPLACE FUNCTION janastudio.get_service_costs(p_service_id UUID)
RETURNS TABLE (
  id UUID, item_name TEXT, quantity_per_service NUMERIC,
  unit_cost NUMERIC, unit TEXT, total_cost NUMERIC
)
LANGUAGE sql STABLE
SET search_path = janastudio
AS $$
  SELECT
    sc.id, sc.item_name, sc.quantity_per_service,
    sc.unit_cost, sc.unit,
    (sc.quantity_per_service * sc.unit_cost) AS total_cost
  FROM janastudio.service_costs sc
  WHERE sc.service_id = p_service_id
  ORDER BY sc.item_name;
$$;

CREATE OR REPLACE FUNCTION janastudio.calculate_service_profit(p_service_id UUID)
RETURNS TABLE (
  service_name TEXT, selling_price NUMERIC, total_cost NUMERIC,
  profit NUMERIC, profit_margin NUMERIC
)
LANGUAGE sql STABLE
SET search_path = janastudio
AS $$
  SELECT
    s.name AS service_name,
    s.price AS selling_price,
    coalesce(sum(sc.quantity_per_service * sc.unit_cost), 0) AS total_cost,
    s.price - coalesce(sum(sc.quantity_per_service * sc.unit_cost), 0) AS profit,
    CASE
      WHEN s.price > 0 THEN
        ((s.price - coalesce(sum(sc.quantity_per_service * sc.unit_cost), 0)) / s.price * 100)
      ELSE 0
    END AS profit_margin
  FROM janastudio.services s
  LEFT JOIN janastudio.service_costs sc ON sc.service_id = s.id
  WHERE s.id = p_service_id
  GROUP BY s.id, s.name, s.price;
$$;

-- =====================================================
-- ROW LEVEL SECURITY (Esquema janastudio)
-- =====================================================

ALTER TABLE janastudio.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.appointment_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.service_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE janastudio.system_settings ENABLE ROW LEVEL SECURITY;

-- Staff policies
CREATE POLICY staff_select_active ON janastudio.staff FOR SELECT TO authenticated
  USING (janastudio.is_active_staff() AND coalesce(role, '') NOT LIKE 'ARCHIVED|%');
CREATE POLICY staff_update_admin_or_self ON janastudio.staff FOR UPDATE TO authenticated
  USING (janastudio.current_staff_kind() = 'admin' OR id = janastudio.current_staff_id())
  WITH CHECK (janastudio.current_staff_kind() = 'admin' OR id = janastudio.current_staff_id());
CREATE POLICY staff_insert_admin ON janastudio.staff FOR INSERT TO authenticated
  WITH CHECK (janastudio.current_staff_kind() = 'admin');
CREATE POLICY staff_delete_admin ON janastudio.staff FOR DELETE TO authenticated
  USING (janastudio.current_staff_kind() = 'admin');

-- Client policies
CREATE POLICY clients_select_matrix ON janastudio.clients FOR SELECT TO authenticated
  USING (janastudio.can_access_client(id));
CREATE POLICY clients_insert_matrix ON janastudio.clients FOR INSERT TO authenticated
  WITH CHECK (janastudio.is_active_staff());
CREATE POLICY clients_update_matrix ON janastudio.clients FOR UPDATE TO authenticated
  USING (janastudio.can_access_client(id)) WITH CHECK (janastudio.can_access_client(id));
CREATE POLICY clients_delete_admin ON janastudio.clients FOR DELETE TO authenticated
  USING (janastudio.current_staff_kind() = 'admin');

-- Appointment policies - SOLO RECEPCION PUEDE CREAR
CREATE POLICY appointments_select_matrix ON janastudio.appointments FOR SELECT TO authenticated
  USING (janastudio.can_access_appointment(id));
CREATE POLICY appointments_insert_reception_only ON janastudio.appointments FOR INSERT TO authenticated
  WITH CHECK (
    janastudio.is_active_staff()
    AND janastudio.current_staff_kind() IN ('admin', 'reception')
    AND created_by_staff_id = janastudio.current_staff_id()
  );
CREATE POLICY appointments_update_matrix ON janastudio.appointments FOR UPDATE TO authenticated
  USING (janastudio.can_access_appointment(id)) WITH CHECK (janastudio.can_access_appointment(id));
CREATE POLICY appointments_delete_ops ON janastudio.appointments FOR DELETE TO authenticated
  USING (janastudio.current_staff_kind() IN ('admin','reception'));

CREATE POLICY appointment_staff_select_matrix ON janastudio.appointment_staff FOR SELECT TO authenticated
  USING (janastudio.can_access_appointment(appointment_id));
CREATE POLICY appointment_staff_write_matrix ON janastudio.appointment_staff FOR ALL TO authenticated
  USING (janastudio.can_access_appointment(appointment_id))
  WITH CHECK (janastudio.can_access_appointment(appointment_id));

-- Transaction policies
CREATE POLICY transactions_select_matrix ON janastudio.transactions FOR SELECT TO authenticated
  USING (
    janastudio.current_staff_kind() = 'admin'
    OR (
      janastudio.current_staff_kind() IN ('cashier','worker')
      AND (
        created_by_staff_id = janastudio.current_staff_id()
        OR staff_id = janastudio.current_staff_id()
      )
    )
  );
CREATE POLICY transactions_insert_matrix ON janastudio.transactions FOR INSERT TO authenticated
  WITH CHECK (janastudio.is_active_staff() AND created_by_staff_id = janastudio.current_staff_id());
CREATE POLICY transactions_update_admin ON janastudio.transactions FOR UPDATE TO authenticated
  USING (janastudio.current_staff_kind() = 'admin') WITH CHECK (janastudio.current_staff_kind() = 'admin');
CREATE POLICY transactions_delete_admin ON janastudio.transactions FOR DELETE TO authenticated
  USING (janastudio.current_staff_kind() = 'admin');

-- Inventory policies
CREATE POLICY inventory_select_matrix ON janastudio.inventory FOR SELECT TO authenticated
  USING (janastudio.current_staff_kind() IN ('admin','reception','cashier'));
CREATE POLICY inventory_insert_ops ON janastudio.inventory FOR INSERT TO authenticated
  WITH CHECK (janastudio.current_staff_kind() IN ('admin','cashier'));
CREATE POLICY inventory_update_matrix ON janastudio.inventory FOR UPDATE TO authenticated
  USING (janastudio.current_staff_kind() IN ('admin','cashier'))
  WITH CHECK (janastudio.current_staff_kind() IN ('admin','cashier'));
CREATE POLICY inventory_delete_ops ON janastudio.inventory FOR DELETE TO authenticated
  USING (janastudio.current_staff_kind() IN ('admin','cashier'));

CREATE POLICY inventory_movements_select_matrix ON janastudio.inventory_movements FOR SELECT TO authenticated
  USING (janastudio.current_staff_kind() IN ('admin','cashier'));
CREATE POLICY inventory_movements_insert_matrix ON janastudio.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (janastudio.is_active_staff());
CREATE POLICY inventory_movements_update_ops ON janastudio.inventory_movements FOR UPDATE TO authenticated
  USING (janastudio.current_staff_kind() IN ('admin','cashier'));

-- Catalog policies
CREATE POLICY services_select_staff ON janastudio.services FOR SELECT TO authenticated USING (janastudio.is_active_staff());
CREATE POLICY services_write_admin ON janastudio.services FOR ALL TO authenticated
  USING (janastudio.current_staff_kind() = 'admin') WITH CHECK (janastudio.current_staff_kind() = 'admin');
CREATE POLICY service_costs_select_staff ON janastudio.service_costs FOR SELECT TO authenticated USING (janastudio.is_active_staff());
CREATE POLICY service_costs_write_admin ON janastudio.service_costs FOR ALL TO authenticated
  USING (janastudio.current_staff_kind() = 'admin') WITH CHECK (janastudio.current_staff_kind() = 'admin');

CREATE POLICY notifications_staff ON janastudio.notifications FOR ALL TO authenticated
  USING (janastudio.is_active_staff()) WITH CHECK (janastudio.is_active_staff());

-- System settings policies
CREATE POLICY system_settings_select_staff ON janastudio.system_settings FOR SELECT TO authenticated
  USING (janastudio.is_active_staff());
CREATE POLICY system_settings_write_admin ON janastudio.system_settings FOR ALL TO authenticated
  USING (janastudio.current_staff_kind() = 'admin');

-- =====================================================
-- GRANTS
-- =====================================================

-- Revocar permisos por defecto
REVOKE ALL ON ALL TABLES IN SCHEMA janastudio FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA janastudio FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA janastudio FROM authenticated;

-- Conceder permisos a authenticated
GRANT SELECT (
  id, auth_user_id, email, name, role, commission_pct, active, created_at,
  image_url, phone, address, specialties, birth_date
) ON janastudio.staff TO authenticated;
GRANT INSERT, UPDATE, DELETE ON janastudio.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON janastudio.clients, janastudio.appointments,
  janastudio.appointment_staff, janastudio.transactions, janastudio.inventory,
  janastudio.inventory_movements, janastudio.services, janastudio.service_costs,
  janastudio.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON janastudio.system_settings TO authenticated;

-- Conceder ejecución de funciones
GRANT EXECUTE ON FUNCTION janastudio.current_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.current_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.current_staff_kind() TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.is_active_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.can_access_appointment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.can_access_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.get_clients_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.get_worker_stats(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.get_service_costs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION janastudio.calculate_service_profit(uuid) TO authenticated;

-- =====================================================
-- REALTIME
-- =====================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE janastudio.clients;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE janastudio.appointments;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE janastudio.transactions;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE janastudio.inventory;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE janastudio.notifications;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- SYSTEM SETTINGS DEFAULTS
-- =====================================================

INSERT INTO janastudio.system_settings (key, value) VALUES
  ('business_name', 'JanaStudio'),
  ('business_type', 'Salón de Belleza'),
  ('currency', 'USD'),
  ('timezone', 'America/Caracas'),
  ('business_phone', '0414-1234567'),
  ('business_address', 'Cagua, Venezuela')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- SCHEMA COMPLETO - Listo para recibir datos
-- =====================================================
