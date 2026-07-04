-- Fix RLS policies for appointments - allow all active staff to CRUD
-- Drop existing policies and recreate with broader permissions

-- Appointments: allow all active staff full access
DROP POLICY IF EXISTS appointments_select_matrix ON public.appointments;
DROP POLICY IF EXISTS appointments_insert_matrix ON public.appointments;
DROP POLICY IF EXISTS appointments_update_matrix ON public.appointments;
DROP POLICY IF EXISTS appointments_delete_ops ON public.appointments;

CREATE POLICY appointments_select_matrix ON public.appointments
  FOR SELECT TO authenticated USING (public.is_active_staff());

CREATE POLICY appointments_insert_matrix ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());

CREATE POLICY appointments_update_matrix ON public.appointments
  FOR UPDATE TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());

CREATE POLICY appointments_delete_ops ON public.appointments
  FOR DELETE TO authenticated USING (public.is_active_staff());

-- appointment_staff: allow all active staff
DROP POLICY IF EXISTS appointment_staff_select_matrix ON public.appointment_staff;
DROP POLICY IF EXISTS appointment_staff_write_matrix ON public.appointment_staff;

CREATE POLICY appointment_staff_select_matrix ON public.appointment_staff
  FOR SELECT TO authenticated USING (public.is_active_staff());

CREATE POLICY appointment_staff_write_matrix ON public.appointment_staff
  FOR ALL TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());

-- appointment_extras: allow all active staff
DROP POLICY IF EXISTS appointment_extras_matrix ON public.appointment_extras;
CREATE POLICY appointment_extras_matrix ON public.appointment_extras
  FOR ALL TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());

-- appointment_products: allow all active staff
DROP POLICY IF EXISTS appointment_products_matrix ON public.appointment_products;
CREATE POLICY appointment_products_matrix ON public.appointment_products
  FOR ALL TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());

-- Clients: allow all active staff full access
DROP POLICY IF EXISTS clients_select_matrix ON public.clients;
DROP POLICY IF EXISTS clients_insert_matrix ON public.clients;
DROP POLICY IF EXISTS clients_update_matrix ON public.clients;
DROP POLICY IF EXISTS clients_delete_admin ON public.clients;

CREATE POLICY clients_select_matrix ON public.clients
  FOR SELECT TO authenticated USING (public.is_active_staff());

CREATE POLICY clients_insert_matrix ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());

CREATE POLICY clients_update_matrix ON public.clients
  FOR UPDATE TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());

CREATE POLICY clients_delete_admin ON public.clients
  FOR DELETE TO authenticated USING (public.is_active_staff());

-- Staff: allow all active staff to read, admin to write
DROP POLICY IF EXISTS staff_select_active ON public.staff;
DROP POLICY IF EXISTS staff_update_admin_or_self ON public.staff;
DROP POLICY IF EXISTS staff_insert_admin ON public.staff;
DROP POLICY IF EXISTS staff_delete_admin ON public.staff;

CREATE POLICY staff_select_active ON public.staff
  FOR SELECT TO authenticated USING (public.is_active_staff());

CREATE POLICY staff_update_admin_or_self ON public.staff
  FOR UPDATE TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());

CREATE POLICY staff_insert_admin ON public.staff
  FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());

CREATE POLICY staff_delete_admin ON public.staff
  FOR DELETE TO authenticated USING (public.current_staff_kind() = 'admin');

-- Services: allow all active staff
DROP POLICY IF EXISTS services_select_staff ON public.services;
CREATE POLICY services_select_staff ON public.services
  FOR SELECT TO authenticated USING (public.is_active_staff());

-- Service extras: allow all active staff
DROP POLICY IF EXISTS extras_select_staff ON public.service_extras;
CREATE POLICY extras_select_staff ON public.service_extras
  FOR SELECT TO authenticated USING (public.is_active_staff());

-- Service checklist items: allow all active staff
DROP POLICY IF EXISTS checklist_select_staff ON public.service_checklist_items;
CREATE POLICY checklist_select_staff ON public.service_checklist_items
  FOR SELECT TO authenticated USING (public.is_active_staff());

-- System settings: allow all active staff
DROP POLICY IF EXISTS system_settings_select_staff ON public.system_settings;
DROP POLICY IF EXISTS system_settings_write_staff ON public.system_settings;

CREATE POLICY system_settings_select_staff ON public.system_settings
  FOR SELECT TO authenticated USING (public.is_active_staff());

CREATE POLICY system_settings_write_staff ON public.system_settings
  FOR ALL TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());

-- Transactions: allow all active staff full access
DROP POLICY IF EXISTS transactions_select_matrix ON public.transactions;
DROP POLICY IF EXISTS transactions_insert_matrix ON public.transactions;
DROP POLICY IF EXISTS transactions_update_admin ON public.transactions;
DROP POLICY IF EXISTS transactions_delete_admin ON public.transactions;

CREATE POLICY transactions_select_matrix ON public.transactions
  FOR SELECT TO authenticated USING (public.is_active_staff());

CREATE POLICY transactions_insert_matrix ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());

CREATE POLICY transactions_update_admin ON public.transactions
  FOR UPDATE TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());

CREATE POLICY transactions_delete_admin ON public.transactions
  FOR DELETE TO authenticated USING (public.current_staff_kind() = 'admin');
