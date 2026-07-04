-- =====================================================
-- Multi-Tenant Schema: astrobarber
-- =====================================================

CREATE SCHEMA IF NOT EXISTS astrobarber;
SET search_path TO astrobarber, public;

-- =====================================================
-- AstroBarber CRM - Schema completo para proyecto nuevo
-- Ejecutar este SQL PRIMERO en el SQL Editor del proyecto nuevo
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- TABLAS BASE
-- =====================================================

CREATE TABLE IF NOT EXISTS astrobarber.staff (
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
  tools JSONB,
  washing_rate NUMERIC DEFAULT 0,
  birth_date TEXT,
  username TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS astrobarber.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  id_card TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  birth_date TEXT,
  hair_type TEXT DEFAULT 'Normal',
  scalp_type TEXT DEFAULT 'Normal',
  active BOOLEAN DEFAULT true,
  recurrence_enabled BOOLEAN DEFAULT false,
  recurrence_days SMALLINT,
  recurrence_last_sent_at TIMESTAMPTZ,
  created_by_staff_id UUID REFERENCES astrobarber.staff(id) ON DELETE SET NULL,
  work_gallery JSONB
);

ALTER TABLE astrobarber.clients
  ADD CONSTRAINT clients_recurrence_days_check
  CHECK (recurrence_days IS NULL OR recurrence_days BETWEEN 1 AND 365);

CREATE TABLE IF NOT EXISTS astrobarber.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  category TEXT,
  commission_barber NUMERIC DEFAULT 40,
  commission_washer NUMERIC DEFAULT 10,
  commission_cashier NUMERIC DEFAULT 5,
  commission_receptionist NUMERIC DEFAULT 5,
  included_items JSONB,
  base_cost NUMERIC DEFAULT 0,
  variable_cost NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  strategy TEXT,
  description TEXT,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS astrobarber.service_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  commission_pct NUMERIC DEFAULT 10,
  active BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS astrobarber.service_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS astrobarber.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  stock NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'unidad',
  is_for_sale BOOLEAN DEFAULT true,
  image_url TEXT,
  commission_pct NUMERIC DEFAULT 10,
  staff_id UUID REFERENCES astrobarber.staff(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  min_stock NUMERIC DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS astrobarber.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES astrobarber.clients(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES astrobarber.staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES astrobarber.services(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Agendado',
  total_price NUMERIC DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  exchange_rate NUMERIC,
  notes TEXT,
  created_by_staff_id UUID REFERENCES astrobarber.staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS astrobarber.appointment_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES astrobarber.appointments(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES astrobarber.staff(id) ON DELETE SET NULL,
  commission_earned NUMERIC DEFAULT 0,
  product_commission NUMERIC DEFAULT 0,
  tip_amount NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS astrobarber.appointment_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES astrobarber.appointments(id) ON DELETE CASCADE,
  extra_id UUID REFERENCES astrobarber.service_extras(id) ON DELETE SET NULL,
  price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS astrobarber.appointment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES astrobarber.appointments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES astrobarber.inventory(id) ON DELETE SET NULL,
  quantity NUMERIC DEFAULT 1,
  price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS astrobarber.transactions (
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
  created_by_staff_id UUID REFERENCES astrobarber.staff(id) ON DELETE SET NULL,
  idempotency_key UUID UNIQUE,
  client_id UUID REFERENCES astrobarber.clients(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES astrobarber.staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS astrobarber.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES astrobarber.inventory(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('entry', 'exit', 'adjustment')),
  amount NUMERIC DEFAULT 0,
  reason TEXT,
  staff_id UUID REFERENCES astrobarber.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS astrobarber.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  link TEXT,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS astrobarber.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES astrobarber.staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS astrobarber.scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES astrobarber.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES astrobarber.appointments(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'recurrence',
  remind_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS astrobarber.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS astrobarber.service_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,
  formula TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS transactions_idempotency_key_uidx
  ON astrobarber.transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS clients_created_by_idx ON astrobarber.clients(created_by_staff_id);
CREATE INDEX IF NOT EXISTS appointments_created_by_idx ON astrobarber.appointments(created_by_staff_id);
CREATE INDEX IF NOT EXISTS appointments_staff_idx ON astrobarber.appointments(staff_id);
CREATE INDEX IF NOT EXISTS appointments_client_idx ON astrobarber.appointments(client_id);
CREATE INDEX IF NOT EXISTS appointment_staff_staff_idx ON astrobarber.appointment_staff(staff_id);
CREATE INDEX IF NOT EXISTS appointment_staff_appointment_idx ON astrobarber.appointment_staff(appointment_id);
CREATE INDEX IF NOT EXISTS inventory_staff_idx ON astrobarber.inventory(staff_id);
CREATE INDEX IF NOT EXISTS scheduled_reminders_pending_idx
  ON astrobarber.scheduled_reminders (sent, remind_at);

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================

CREATE OR REPLACE FUNCTION astrobarber.current_staff_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
  SELECT id FROM astrobarber.staff
  WHERE auth_user_id = auth.uid()
    AND coalesce(active, true)
    AND coalesce(role, '') NOT LIKE 'ARCHIVED|%'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION astrobarber.current_staff_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
  SELECT btrim(split_part(coalesce(role, ''), '|', 1))
  FROM astrobarber.staff
  WHERE auth_user_id = auth.uid()
    AND coalesce(active, true)
    AND coalesce(role, '') NOT LIKE 'ARCHIVED|%'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION astrobarber.current_staff_kind()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
  SELECT case
    when lower(astrobarber.current_staff_role()) = 'admin' then 'admin'
    when lower(astrobarber.current_staff_role()) like '%recep%' then 'reception'
    when lower(astrobarber.current_staff_role()) like '%caja%' then 'cashier'
    when lower(astrobarber.current_staff_role()) like '%asistent%'
      or lower(astrobarber.current_staff_role()) like '%lavado%'
      or lower(astrobarber.current_staff_role()) like '%operaciones%' then 'assistant'
    when lower(astrobarber.current_staff_role()) like '%barber%'
      or lower(astrobarber.current_staff_role()) like '%barbero%' then 'barber'
    else 'other'
  end
$$;

CREATE OR REPLACE FUNCTION astrobarber.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = astrobarber, public
AS $$ SELECT astrobarber.current_staff_id() IS NOT NULL $$;

CREATE OR REPLACE FUNCTION astrobarber.can_access_appointment(p_appointment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
  SELECT case
    when not astrobarber.is_active_staff() then false
    when astrobarber.current_staff_kind() in ('admin','reception','cashier','assistant') then true
    when astrobarber.current_staff_kind() = 'barber' then exists (
      SELECT 1 FROM astrobarber.appointments a
      WHERE a.id = p_appointment_id
        AND (
          a.staff_id = astrobarber.current_staff_id()
          or a.created_by_staff_id = astrobarber.current_staff_id()
          or exists (
            SELECT 1 FROM astrobarber.appointment_staff aps
            WHERE aps.appointment_id = a.id
              AND aps.staff_id = astrobarber.current_staff_id()
          )
        )
    )
    else false
  end
$$;

CREATE OR REPLACE FUNCTION astrobarber.can_access_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
  SELECT case
    when not astrobarber.is_active_staff() then false
    when astrobarber.current_staff_kind() in ('admin','reception','cashier','assistant') then true
    when astrobarber.current_staff_kind() = 'barber' then exists (
      SELECT 1 FROM astrobarber.clients c
      WHERE c.id = p_client_id
        AND (
          c.created_by_staff_id = astrobarber.current_staff_id()
          or exists (
            SELECT 1 FROM astrobarber.appointments a
            WHERE a.client_id = c.id
              AND (
                a.staff_id = astrobarber.current_staff_id()
                or a.created_by_staff_id = astrobarber.current_staff_id()
                or exists (
                  SELECT 1 FROM astrobarber.appointment_staff aps
                  WHERE aps.appointment_id = a.id
                    AND aps.staff_id = astrobarber.current_staff_id()
                )
              )
          )
        )
    )
    else false
  end
$$;

-- =====================================================
-- FUNCIONES RPC (Egress Optimization)
-- =====================================================

CREATE OR REPLACE FUNCTION astrobarber.get_sale_inventory_catalog()
RETURNS TABLE (
  id UUID, name TEXT, category TEXT, stock NUMERIC, price NUMERIC,
  commission_pct NUMERIC, is_for_sale BOOLEAN, image_url TEXT, staff_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
  SELECT i.id, i.name, i.category, i.stock, i.price, i.commission_pct,
         i.is_for_sale, i.image_url, i.staff_id
  FROM astrobarber.inventory i
  WHERE astrobarber.is_active_staff() AND coalesce(i.is_for_sale, true)
  ORDER BY i.name
$$;

CREATE OR REPLACE FUNCTION astrobarber.get_clients_with_stats()
RETURNS TABLE (
  id UUID, name TEXT, phone TEXT, id_card TEXT, created_at TIMESTAMPTZ,
  birth_date TEXT, hair_type TEXT, scalp_type TEXT, active BOOLEAN,
  recurrence_enabled BOOLEAN, recurrence_days SMALLINT, recurrence_last_sent_at TIMESTAMPTZ,
  created_by_staff_id UUID, total_visits BIGINT, total_spent NUMERIC,
  served_by_staff_ids UUID[]
)
LANGUAGE sql STABLE
SET search_path = astrobarber, public
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
          SELECT a2.staff_id FROM appointments a2 WHERE a2.client_id = c.id AND a2.status IN ('Completado', 'En Silla', 'Por Pagar') AND a2.service_id IS NOT NULL AND a2.staff_id IS NOT NULL
          UNION
          SELECT astaff.staff_id FROM appointments a2 JOIN appointment_staff astaff ON astaff.appointment_id = a2.id WHERE a2.client_id = c.id AND a2.status IN ('Completado', 'En Silla', 'Por Pagar') AND a2.service_id IS NOT NULL AND astaff.staff_id IS NOT NULL
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

CREATE OR REPLACE FUNCTION astrobarber.get_barber_production_stats(p_start_date TIMESTAMPTZ)
RETURNS TABLE (
  staff_id UUID, total_monthly NUMERIC, total_weekly NUMERIC,
  total_today NUMERIC, appointment_count BIGINT
)
LANGUAGE sql STABLE
SET search_path = astrobarber, public
AS $$
  WITH appts AS (
    SELECT a.id, a.staff_id, a.total_price, a.created_at, a.scheduled_at
    FROM appointments a
    WHERE a.status = 'Completado'
      AND a.created_at >= p_start_date
      AND a.service_id IS NOT NULL
  ),
  main_barbers AS (
    SELECT
      a.staff_id,
      coalesce(sum(CASE WHEN (a.created_at >= date_trunc('month', now()) OR a.scheduled_at >= date_trunc('month', now())) THEN a.total_price END), 0) AS total_monthly,
      coalesce(sum(CASE WHEN (a.created_at >= date_trunc('week', now()) OR a.scheduled_at >= date_trunc('week', now())) THEN a.total_price END), 0) AS total_weekly,
      coalesce(sum(CASE WHEN (a.created_at::date = current_date OR a.scheduled_at::date = current_date) THEN a.total_price END), 0) AS total_today,
      count(*) FILTER (WHERE a.created_at::date = current_date OR a.scheduled_at::date = current_date)::bigint AS appointment_count
    FROM appts a
    WHERE a.staff_id IS NOT NULL
    GROUP BY a.staff_id
  ),
  assistants AS (
    SELECT
      astaff.staff_id,
      coalesce(sum(CASE WHEN (a.created_at >= date_trunc('month', now()) OR a.scheduled_at >= date_trunc('month', now())) THEN (coalesce(astaff.commission_earned, 0) + coalesce(astaff.product_commission, 0) + coalesce(astaff.tip_amount, 0)) END), 0) AS total_monthly,
      coalesce(sum(CASE WHEN (a.created_at >= date_trunc('week', now()) OR a.scheduled_at >= date_trunc('week', now())) THEN (coalesce(astaff.commission_earned, 0) + coalesce(astaff.product_commission, 0) + coalesce(astaff.tip_amount, 0)) END), 0) AS total_weekly,
      coalesce(sum(CASE WHEN (a.created_at::date = current_date OR a.scheduled_at::date = current_date) THEN (coalesce(astaff.commission_earned, 0) + coalesce(astaff.product_commission, 0) + coalesce(astaff.tip_amount, 0)) END), 0) AS total_today,
      count(*) FILTER (WHERE a.created_at::date = current_date OR a.scheduled_at::date = current_date)::bigint AS appointment_count
    FROM appts a
    JOIN appointment_staff astaff ON astaff.appointment_id = a.id
    WHERE astaff.staff_id IS NOT NULL
    GROUP BY astaff.staff_id
  )
  SELECT
    coalesce(m.staff_id, a.staff_id) AS staff_id,
    coalesce(m.total_monthly, 0) + coalesce(a.total_monthly, 0) AS total_monthly,
    coalesce(m.total_weekly, 0) + coalesce(a.total_weekly, 0) AS total_weekly,
    coalesce(m.total_today, 0) + coalesce(a.total_today, 0) AS total_today,
    coalesce(m.appointment_count, 0) + coalesce(a.appointment_count, 0) AS appointment_count
  FROM main_barbers m
  FULL JOIN assistants a ON a.staff_id = m.staff_id;
$$;

CREATE OR REPLACE FUNCTION astrobarber.create_client_for_staff(p_client JSONB)
RETURNS astrobarber.clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
DECLARE
  v_staff_id UUID;
  v_client astrobarber.clients;
  v_birth_date DATE;
  v_recurrence_days INTEGER;
BEGIN
  v_staff_id := astrobarber.current_staff_id();
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is not linked to active staff'
      USING errcode = '42501';
  END IF;

  IF nullif(btrim(coalesce(p_client->>'name', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Client name is required'
      USING errcode = '23502';
  END IF;

  IF nullif(btrim(coalesce(p_client->>'birth_date', '')), '') IS NOT NULL THEN
    v_birth_date := (p_client->>'birth_date')::date;
  END IF;

  IF nullif(btrim(coalesce(p_client->>'recurrence_days', '')), '') IS NOT NULL THEN
    v_recurrence_days := (p_client->>'recurrence_days')::integer;
  END IF;

  INSERT INTO astrobarber.clients (
    name, phone, id_card, birth_date, hair_type, scalp_type,
    created_at, created_by_staff_id, active, recurrence_enabled, recurrence_days
  ) VALUES (
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
  RETURNING * INTO v_client;

  RETURN v_client;
END;
$$;

-- Process checkout atomic
CREATE OR REPLACE FUNCTION astrobarber.process_checkout_atomic(
  p_payment JSONB,
  p_idempotency_key UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
DECLARE
  v_existing UUID;
  v_transaction_id UUID;
  v_primary_appointment UUID;
  v_appointment_id UUID;
  v_staff JSONB;
  v_product JSONB;
  v_quantity NUMERIC;
BEGIN
  IF NOT astrobarber.is_active_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'Missing idempotency key'; END IF;

  SELECT id INTO v_existing FROM astrobarber.transactions
  WHERE idempotency_key = p_idempotency_key LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_primary_appointment := nullif(coalesce(
    p_payment->>'appointmentId', p_payment->'appointmentIds'->>0
  ), '')::uuid;

  FOR v_appointment_id IN
    SELECT value::uuid FROM jsonb_array_elements_text(coalesce(p_payment->'appointmentIds','[]'::jsonb))
  LOOP
    IF NOT astrobarber.can_access_appointment(v_appointment_id) THEN RAISE EXCEPTION 'Appointment access denied'; END IF;
    UPDATE astrobarber.appointments SET status='Completado', completed_at=now() WHERE id=v_appointment_id;
  END LOOP;
  IF jsonb_array_length(coalesce(p_payment->'appointmentIds','[]'::jsonb)) = 0 AND v_primary_appointment IS NOT NULL THEN
    IF NOT astrobarber.can_access_appointment(v_primary_appointment) THEN RAISE EXCEPTION 'Appointment access denied'; END IF;
    UPDATE astrobarber.appointments SET status='Completado', completed_at=now() WHERE id=v_primary_appointment;
  END IF;

  IF v_primary_appointment IS NOT NULL THEN
    DELETE FROM astrobarber.appointment_staff
    WHERE appointment_id IN (
      SELECT value::uuid FROM jsonb_array_elements_text(
        CASE WHEN jsonb_array_length(coalesce(p_payment->'appointmentIds','[]'::jsonb)) > 0
          THEN p_payment->'appointmentIds' ELSE jsonb_build_array(v_primary_appointment) END
      )
    );
    FOR v_staff IN SELECT value FROM jsonb_array_elements(coalesce(p_payment->'staffInvolved','[]'::jsonb))
    LOOP
      IF nullif(v_staff->>'staffId','') IS NOT NULL THEN
        INSERT INTO astrobarber.appointment_staff(appointment_id,staff_id,commission_earned,product_commission,tip_amount)
        VALUES (v_primary_appointment,(v_staff->>'staffId')::uuid,
          coalesce((v_staff->>'commissionEarned')::numeric,0),
          coalesce((v_staff->>'productCommissionEarned')::numeric,0),
          coalesce((v_staff->>'tip')::numeric,0));
      END IF;
    END LOOP;
  END IF;

  FOR v_product IN SELECT value FROM jsonb_array_elements(coalesce(p_payment->'products','[]'::jsonb))
  LOOP
    v_quantity := greatest(coalesce((v_product->>'quantity')::numeric,1),0);
    UPDATE astrobarber.inventory SET stock=stock-v_quantity, updated_at=now()
    WHERE id=(v_product->>'id')::uuid AND stock>=v_quantity;
    IF NOT found THEN RAISE EXCEPTION 'Insufficient inventory for product %', v_product->>'id'; END IF;
    INSERT INTO astrobarber.inventory_movements(product_id,type,amount,reason,staff_id)
    VALUES ((v_product->>'id')::uuid,'exit',v_quantity,
      'Venta - Cliente: ' || coalesce(p_payment->>'clientName','Cliente'),astrobarber.current_staff_id());
  END LOOP;

  INSERT INTO astrobarber.transactions(
    description,amount,type,category,exchange_rate,currency,metadata,
    created_at,created_by_staff_id,idempotency_key,client_id
  ) VALUES (
    CASE WHEN v_primary_appointment IS NOT NULL
      THEN 'VENTA FINAL - Cliente: ' || coalesce(p_payment->>'clientName','Cliente')
      ELSE 'VENTA DIRECTA PRODUCTOS - Cliente: ' || coalesce(p_payment->>'clientName','Cliente') END,
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
    now(),astrobarber.current_staff_id(),p_idempotency_key,nullif(p_payment->>'clientId','')::uuid
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
EXCEPTION WHEN unique_violation THEN
  SELECT id INTO v_existing FROM astrobarber.transactions WHERE idempotency_key=p_idempotency_key;
  RETURN v_existing;
END
$$;

-- =====================================================
-- FUNCIONES TRIGGER
-- =====================================================

-- Protect staff sensitive fields
CREATE OR REPLACE FUNCTION astrobarber.protect_staff_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
BEGIN
  IF astrobarber.current_staff_kind() <> 'admin' AND (
    new.role IS DISTINCT FROM old.role
    OR new.email IS DISTINCT FROM old.email
    OR new.auth_user_id IS DISTINCT FROM old.auth_user_id
    OR new.commission_pct IS DISTINCT FROM old.commission_pct
    OR new.washing_rate IS DISTINCT FROM old.washing_rate
    OR new.active IS DISTINCT FROM old.active
    OR new.username IS DISTINCT FROM old.username
    OR new.password IS DISTINCT FROM old.password
  ) THEN
    RAISE EXCEPTION 'Only Admin can update protected staff fields';
  END IF;
  RETURN new;
END
$$;

DROP TRIGGER IF EXISTS protect_staff_sensitive_fields_trigger ON astrobarber.staff;
CREATE TRIGGER protect_staff_sensitive_fields_trigger
BEFORE UPDATE ON astrobarber.staff FOR EACH ROW
EXECUTE FUNCTION astrobarber.protect_staff_sensitive_fields();

-- Enforce client creator
CREATE OR REPLACE FUNCTION astrobarber.enforce_client_creator()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  v_staff_id := astrobarber.current_staff_id();
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is not linked to active staff'
      USING errcode = '42501';
  END IF;
  new.created_by_staff_id := v_staff_id;
  RETURN new;
END
$$;

DROP TRIGGER IF EXISTS enforce_client_creator_trigger ON astrobarber.clients;
CREATE TRIGGER enforce_client_creator_trigger
BEFORE INSERT ON astrobarber.clients
FOR EACH ROW EXECUTE FUNCTION astrobarber.enforce_client_creator();

-- Sync appointment exchange rate
CREATE OR REPLACE FUNCTION astrobarber.sync_appointment_exchange_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = astrobarber, public, pg_temp
AS $$
DECLARE
  v_appointment_id TEXT;
BEGIN
  IF new.type <> 'income' OR coalesce(new.exchange_rate, 0) <= 0 THEN
    RETURN new;
  END IF;

  v_appointment_id := new.metadata->>'appointment_id';
  IF v_appointment_id IS NOT NULL AND v_appointment_id <> '' THEN
    UPDATE astrobarber.appointments
    SET exchange_rate = new.exchange_rate
    WHERE id = v_appointment_id::uuid;
  END IF;

  FOR v_appointment_id IN
    SELECT value
    FROM jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(new.metadata->'appointmentIds') = 'array'
          THEN new.metadata->'appointmentIds'
        ELSE '[]'::jsonb
      END
    )
  LOOP
    UPDATE astrobarber.appointments
    SET exchange_rate = new.exchange_rate
    WHERE id = v_appointment_id::uuid;
  END LOOP;

  RETURN new;
END
$$;

DROP TRIGGER IF EXISTS sync_appointment_exchange_rate_trigger ON astrobarber.transactions;
CREATE TRIGGER sync_appointment_exchange_rate_trigger
AFTER INSERT OR UPDATE OF exchange_rate, metadata ON astrobarber.transactions
FOR EACH ROW EXECUTE FUNCTION astrobarber.sync_appointment_exchange_rate();

-- Queue client recurrence reminder
CREATE OR REPLACE FUNCTION astrobarber.queue_client_recurrence_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = astrobarber, public
AS $$
DECLARE
  v_client astrobarber.clients%ROWTYPE;
  v_completed_at TIMESTAMPTZ;
BEGIN
  IF new.status IS DISTINCT FROM 'Completado'
     OR (tg_op = 'UPDATE' AND old.status IS NOT DISTINCT FROM 'Completado')
     OR new.client_id IS NULL THEN
    RETURN new;
  END IF;

  SELECT * INTO v_client FROM astrobarber.clients WHERE id = new.client_id;
  IF NOT coalesce(v_client.active, true)
     OR NOT coalesce(v_client.recurrence_enabled, false)
     OR v_client.recurrence_days IS NULL THEN
    RETURN new;
  END IF;

  v_completed_at := coalesce(new.completed_at, now());
  INSERT INTO astrobarber.scheduled_reminders (client_id, appointment_id, kind, remind_at, sent)
  VALUES (
    new.client_id,
    new.id,
    'recurrence',
    v_completed_at + make_interval(days => v_client.recurrence_days),
    false
  )
  ON CONFLICT (client_id, kind) WHERE sent = false
  DO UPDATE SET
    appointment_id = excluded.appointment_id,
    remind_at = excluded.remind_at,
    attempts = 0,
    last_error = null;

  RETURN new;
END
$$;

DROP TRIGGER IF EXISTS queue_client_recurrence_reminder_trigger ON astrobarber.appointments;
CREATE TRIGGER queue_client_recurrence_reminder_trigger
AFTER INSERT OR UPDATE OF status ON astrobarber.appointments
FOR EACH ROW EXECUTE FUNCTION astrobarber.queue_client_recurrence_reminder();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE astrobarber.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.appointment_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.appointment_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.appointment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.service_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.service_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE astrobarber.scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Staff policies
CREATE POLICY staff_select_active ON astrobarber.staff FOR SELECT TO authenticated
  USING (astrobarber.is_active_staff() AND coalesce(role, '') NOT LIKE 'ARCHIVED|%');
CREATE POLICY staff_update_admin_or_self ON astrobarber.staff FOR UPDATE TO authenticated
  USING (astrobarber.current_staff_kind() = 'admin' OR id = astrobarber.current_staff_id())
  WITH CHECK (astrobarber.current_staff_kind() = 'admin' OR id = astrobarber.current_staff_id());
CREATE POLICY staff_insert_admin ON astrobarber.staff FOR INSERT TO authenticated
  WITH CHECK (astrobarber.current_staff_kind() = 'admin');
CREATE POLICY staff_delete_admin ON astrobarber.staff FOR DELETE TO authenticated
  USING (astrobarber.current_staff_kind() = 'admin');

-- Client policies
CREATE POLICY clients_select_matrix ON astrobarber.clients FOR SELECT TO authenticated
  USING (astrobarber.can_access_client(id));
CREATE POLICY clients_insert_matrix ON astrobarber.clients FOR INSERT TO authenticated
  WITH CHECK (astrobarber.is_active_staff());
CREATE POLICY clients_update_matrix ON astrobarber.clients FOR UPDATE TO authenticated
  USING (astrobarber.can_access_client(id)) WITH CHECK (astrobarber.can_access_client(id));
CREATE POLICY clients_delete_admin ON astrobarber.clients FOR DELETE TO authenticated
  USING (astrobarber.current_staff_kind() = 'admin');

-- Appointment policies
CREATE POLICY appointments_select_matrix ON astrobarber.appointments FOR SELECT TO authenticated
  USING (astrobarber.can_access_appointment(id));
CREATE POLICY appointments_insert_matrix ON astrobarber.appointments FOR INSERT TO authenticated
  WITH CHECK (astrobarber.is_active_staff() AND created_by_staff_id = astrobarber.current_staff_id());
CREATE POLICY appointments_update_matrix ON astrobarber.appointments FOR UPDATE TO authenticated
  USING (astrobarber.can_access_appointment(id)) WITH CHECK (astrobarber.can_access_appointment(id));
CREATE POLICY appointments_delete_ops ON astrobarber.appointments FOR DELETE TO authenticated
  USING (astrobarber.current_staff_kind() IN ('admin','reception'));

CREATE POLICY appointment_staff_select_matrix ON astrobarber.appointment_staff FOR SELECT TO authenticated
  USING (astrobarber.can_access_appointment(appointment_id));
CREATE POLICY appointment_staff_write_matrix ON astrobarber.appointment_staff FOR ALL TO authenticated
  USING (astrobarber.can_access_appointment(appointment_id))
  WITH CHECK (astrobarber.can_access_appointment(appointment_id));
CREATE POLICY appointment_extras_matrix ON astrobarber.appointment_extras FOR ALL TO authenticated
  USING (astrobarber.can_access_appointment(appointment_id))
  WITH CHECK (astrobarber.can_access_appointment(appointment_id));
CREATE POLICY appointment_products_matrix ON astrobarber.appointment_products FOR ALL TO authenticated
  USING (astrobarber.can_access_appointment(appointment_id))
  WITH CHECK (astrobarber.can_access_appointment(appointment_id));

-- Transaction policies
CREATE POLICY transactions_select_matrix ON astrobarber.transactions FOR SELECT TO authenticated
  USING (
    astrobarber.current_staff_kind() = 'admin'
    OR (
      astrobarber.current_staff_kind() IN ('cashier','barber','assistant')
      AND (
        created_by_staff_id = astrobarber.current_staff_id()
        OR staff_id = astrobarber.current_staff_id()
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(metadata->'staffInvolved') = 'array'
              THEN metadata->'staffInvolved' ELSE '[]'::jsonb END
          ) member
          WHERE member->>'staffId' = astrobarber.current_staff_id()::text
        )
      )
    )
  );
CREATE POLICY transactions_insert_matrix ON astrobarber.transactions FOR INSERT TO authenticated
  WITH CHECK (astrobarber.is_active_staff() AND created_by_staff_id = astrobarber.current_staff_id());
CREATE POLICY transactions_update_admin ON astrobarber.transactions FOR UPDATE TO authenticated
  USING (astrobarber.current_staff_kind() = 'admin') WITH CHECK (astrobarber.current_staff_kind() = 'admin');
CREATE POLICY transactions_delete_admin ON astrobarber.transactions FOR DELETE TO authenticated
  USING (astrobarber.current_staff_kind() = 'admin');

-- Inventory policies
CREATE POLICY inventory_select_matrix ON astrobarber.inventory FOR SELECT TO authenticated
  USING (
    astrobarber.current_staff_kind() IN ('admin','reception','cashier','assistant')
    OR staff_id = astrobarber.current_staff_id()
    OR EXISTS (
      SELECT 1 FROM astrobarber.appointment_products ap
      WHERE ap.product_id = inventory.id AND astrobarber.can_access_appointment(ap.appointment_id)
    )
  );
CREATE POLICY inventory_insert_ops ON astrobarber.inventory FOR INSERT TO authenticated
  WITH CHECK (
    astrobarber.is_active_staff()
    AND (astrobarber.current_staff_kind() IN ('admin','cashier') OR staff_id = astrobarber.current_staff_id())
  );
CREATE POLICY inventory_update_matrix ON astrobarber.inventory FOR UPDATE TO authenticated
  USING (astrobarber.current_staff_kind() IN ('admin','cashier') OR staff_id = astrobarber.current_staff_id())
  WITH CHECK (astrobarber.current_staff_kind() IN ('admin','cashier') OR staff_id = astrobarber.current_staff_id());
CREATE POLICY inventory_delete_ops ON astrobarber.inventory FOR DELETE TO authenticated
  USING (astrobarber.current_staff_kind() IN ('admin','cashier'));

CREATE POLICY inventory_movements_select_matrix ON astrobarber.inventory_movements FOR SELECT TO authenticated
  USING (astrobarber.current_staff_kind() IN ('admin','cashier') OR staff_id = astrobarber.current_staff_id());
CREATE POLICY inventory_movements_insert_matrix ON astrobarber.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (astrobarber.is_active_staff() AND coalesce(staff_id, astrobarber.current_staff_id()) = astrobarber.current_staff_id());
CREATE POLICY inventory_movements_update_ops ON astrobarber.inventory_movements FOR UPDATE TO authenticated
  USING (astrobarber.current_staff_kind() IN ('admin','cashier'))
  WITH CHECK (astrobarber.current_staff_kind() IN ('admin','cashier'));
CREATE POLICY inventory_movements_delete_ops ON astrobarber.inventory_movements FOR DELETE TO authenticated
  USING (astrobarber.current_staff_kind() IN ('admin','cashier'));

-- Catalog policies
CREATE POLICY services_select_staff ON astrobarber.services FOR SELECT TO authenticated USING (astrobarber.is_active_staff());
CREATE POLICY services_write_admin ON astrobarber.services FOR ALL TO authenticated
  USING (astrobarber.current_staff_kind() = 'admin') WITH CHECK (astrobarber.current_staff_kind() = 'admin');
CREATE POLICY extras_select_staff ON astrobarber.service_extras FOR SELECT TO authenticated USING (astrobarber.is_active_staff());
CREATE POLICY extras_write_admin ON astrobarber.service_extras FOR ALL TO authenticated
  USING (astrobarber.current_staff_kind() = 'admin') WITH CHECK (astrobarber.current_staff_kind() = 'admin');
CREATE POLICY checklist_select_staff ON astrobarber.service_checklist_items FOR SELECT TO authenticated USING (astrobarber.is_active_staff());
CREATE POLICY checklist_write_admin ON astrobarber.service_checklist_items FOR ALL TO authenticated
  USING (astrobarber.current_staff_kind() = 'admin') WITH CHECK (astrobarber.current_staff_kind() = 'admin');
CREATE POLICY notifications_staff ON astrobarber.notifications FOR ALL TO authenticated
  USING (astrobarber.is_active_staff()) WITH CHECK (astrobarber.is_active_staff());

-- System settings policies
CREATE POLICY system_settings_select_staff ON astrobarber.system_settings FOR SELECT TO authenticated
  USING (astrobarber.is_active_staff());
CREATE POLICY system_settings_write_staff ON astrobarber.system_settings FOR ALL TO authenticated
  USING (
    astrobarber.is_active_staff() AND key IN ('whatsapp_template_birthday','whatsapp_template_followup','whatsapp_template_welcome','whatsapp_template_appointment')
  )
  WITH CHECK (
    astrobarber.is_active_staff() AND key IN ('whatsapp_template_birthday','whatsapp_template_followup','whatsapp_template_welcome','whatsapp_template_appointment')
  );

-- =====================================================
-- GRANTS
-- =====================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON astrobarber.staff, astrobarber.clients, astrobarber.appointments,
  astrobarber.appointment_staff, astrobarber.appointment_extras, astrobarber.appointment_products,
  astrobarber.transactions, astrobarber.inventory, astrobarber.inventory_movements,
  astrobarber.services, astrobarber.service_extras, astrobarber.service_checklist_items,
  astrobarber.notifications FROM authenticated;
GRANT INSERT, UPDATE, DELETE ON astrobarber.staff TO authenticated;
REVOKE SELECT ON astrobarber.staff FROM authenticated;
GRANT SELECT (
  id, auth_user_id, email, name, role, commission_pct, active, created_at,
  image_url, phone, address, tools, washing_rate, birth_date
) ON astrobarber.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON astrobarber.clients, astrobarber.appointments,
  astrobarber.appointment_staff, astrobarber.appointment_extras, astrobarber.appointment_products,
  astrobarber.transactions, astrobarber.inventory, astrobarber.inventory_movements,
  astrobarber.services, astrobarber.service_extras, astrobarber.service_checklist_items,
  astrobarber.notifications TO authenticated;
REVOKE ALL ON FUNCTION astrobarber.current_staff_id() FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.current_staff_role() FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.current_staff_kind() FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.is_active_staff() FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.can_access_appointment(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.can_access_client(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.get_sale_inventory_catalog() FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.process_checkout_atomic(jsonb,uuid) FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.create_client_for_staff(jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.get_clients_with_stats() FROM public, anon;
REVOKE ALL ON FUNCTION astrobarber.get_barber_production_stats(timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION astrobarber.current_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.current_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.current_staff_kind() TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.is_active_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.can_access_appointment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.can_access_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.get_sale_inventory_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.process_checkout_atomic(jsonb,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.create_client_for_staff(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.get_clients_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION astrobarber.get_barber_production_stats(timestamptz) TO authenticated;

-- =====================================================
-- REALTIME
-- =====================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE astrobarber.clients;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE astrobarber.appointments;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE astrobarber.transactions;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE astrobarber.inventory;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE astrobarber.notifications;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE astrobarber.appointment_staff;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE astrobarber.inventory_movements;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- SYSTEM SETTINGS DEFAULTS
-- =====================================================

INSERT INTO astrobarber.system_settings (key, value) VALUES
  ('whatsapp_template_birthday', 'Hola {{nombre}}! Te deseamos un feliz cumpleanos de parte de Astro Barbershop.'),
  ('whatsapp_template_followup', 'Hola {{nombre}}! Ya es momento de renovar tu corte. Te esperamos en Astro Barbershop.'),
  ('whatsapp_template_welcome', 'Hola {{nombre}}! Bienvenido a Astro Barbershop.'),
  ('whatsapp_template_appointment', 'Hola {{nombre}}! Tu cita quedo agendada para el {{fecha}} a las {{hora}}. Servicio: {{servicio}}. Barbero: {{barbero}}.')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- SCHEMA COMPLETO - Listo para recibir datos
-- =====================================================
