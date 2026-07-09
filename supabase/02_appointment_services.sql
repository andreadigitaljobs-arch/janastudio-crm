-- Migration: Add support for multiple services per appointment (Orders)
-- Purpose: Enable one appointment to have multiple services (with different staff members)

-- 1. Create appointment_services table (N:N relationship)
CREATE TABLE IF NOT EXISTS janastudio.appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES janastudio.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES janastudio.services(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES janastudio.staff(id) ON DELETE SET NULL,
  sequence_order INTEGER DEFAULT 0,
  price_paid NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pendiente', -- Pendiente, En Progreso, Completado
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS appointment_services_appointment_idx ON janastudio.appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS appointment_services_service_idx ON janastudio.appointment_services(service_id);
CREATE INDEX IF NOT EXISTS appointment_services_staff_idx ON janastudio.appointment_services(staff_id);

-- 2. Create service_extras table (complementos/extras de servicios)
CREATE TABLE IF NOT EXISTS janastudio.service_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  commission_pct NUMERIC DEFAULT 10,
  active BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create appointment_extras table (extras agregados a una cita)
CREATE TABLE IF NOT EXISTS janastudio.appointment_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES janastudio.appointments(id) ON DELETE CASCADE,
  appointment_service_id UUID REFERENCES janastudio.appointment_services(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES janastudio.service_extras(id) ON DELETE CASCADE,
  price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointment_extras_appointment_idx ON janastudio.appointment_extras(appointment_id);
CREATE INDEX IF NOT EXISTS appointment_extras_service_idx ON janastudio.appointment_extras(appointment_service_id);

-- 4. Create appointment_products table (productos vendidos en una cita)
CREATE TABLE IF NOT EXISTS janastudio.appointment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES janastudio.appointments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES janastudio.inventory(id) ON DELETE CASCADE,
  quantity NUMERIC DEFAULT 1,
  price NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointment_products_appointment_idx ON janastudio.appointment_products(appointment_id);
CREATE INDEX IF NOT EXISTS appointment_products_product_idx ON janastudio.appointment_products(product_id);

-- 5. Add commission_pct to inventory table if not exists
ALTER TABLE IF EXISTS janastudio.inventory
ADD COLUMN IF NOT EXISTS commission_pct NUMERIC DEFAULT 10;

-- 6. Create RLS policies for new tables
-- appointment_services
ALTER TABLE janastudio.appointment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_services_select" ON janastudio.appointment_services
  FOR SELECT USING (true);

CREATE POLICY "appointment_services_insert" ON janastudio.appointment_services
  FOR INSERT WITH CHECK (true);

CREATE POLICY "appointment_services_update" ON janastudio.appointment_services
  FOR UPDATE USING (true);

-- appointment_extras
ALTER TABLE janastudio.appointment_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_extras_select" ON janastudio.appointment_extras
  FOR SELECT USING (true);

CREATE POLICY "appointment_extras_insert" ON janastudio.appointment_extras
  FOR INSERT WITH CHECK (true);

CREATE POLICY "appointment_extras_update" ON janastudio.appointment_extras
  FOR UPDATE USING (true);

-- appointment_products
ALTER TABLE janastudio.appointment_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_products_select" ON janastudio.appointment_products
  FOR SELECT USING (true);

CREATE POLICY "appointment_products_insert" ON janastudio.appointment_products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "appointment_products_update" ON janastudio.appointment_products
  FOR UPDATE USING (true);

-- service_extras
ALTER TABLE janastudio.service_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_extras_select" ON janastudio.service_extras
  FOR SELECT USING (true);

CREATE POLICY "service_extras_insert" ON janastudio.service_extras
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_extras_update" ON janastudio.service_extras
  FOR UPDATE USING (true);

-- 7. Create trigger to update appointment total_price when services are added/modified
CREATE OR REPLACE FUNCTION janastudio.update_appointment_total_price()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE janastudio.appointments
  SET total_price = (
    SELECT COALESCE(SUM(price_paid), 0) FROM janastudio.appointment_services WHERE appointment_id = NEW.appointment_id
  ) + (
    SELECT COALESCE(SUM(price), 0) FROM janastudio.appointment_extras WHERE appointment_id = NEW.appointment_id
  ) + (
    SELECT COALESCE(SUM(price * quantity), 0) FROM janastudio.appointment_products WHERE appointment_id = NEW.appointment_id
  )
  WHERE id = NEW.appointment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointment_total_on_service_insert
AFTER INSERT ON janastudio.appointment_services
FOR EACH ROW EXECUTE FUNCTION janastudio.update_appointment_total_price();

CREATE TRIGGER update_appointment_total_on_service_update
AFTER UPDATE ON janastudio.appointment_services
FOR EACH ROW EXECUTE FUNCTION janastudio.update_appointment_total_price();

CREATE TRIGGER update_appointment_total_on_service_delete
AFTER DELETE ON janastudio.appointment_services
FOR EACH ROW EXECUTE FUNCTION janastudio.update_appointment_total_price();

CREATE TRIGGER update_appointment_total_on_extra_insert
AFTER INSERT ON janastudio.appointment_extras
FOR EACH ROW EXECUTE FUNCTION janastudio.update_appointment_total_price();

CREATE TRIGGER update_appointment_total_on_extra_delete
AFTER DELETE ON janastudio.appointment_extras
FOR EACH ROW EXECUTE FUNCTION janastudio.update_appointment_total_price();

CREATE TRIGGER update_appointment_total_on_product_insert
AFTER INSERT ON janastudio.appointment_products
FOR EACH ROW EXECUTE FUNCTION janastudio.update_appointment_total_price();

CREATE TRIGGER update_appointment_total_on_product_delete
AFTER DELETE ON janastudio.appointment_products
FOR EACH ROW EXECUTE FUNCTION janastudio.update_appointment_total_price();
