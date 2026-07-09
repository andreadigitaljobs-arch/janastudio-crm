-- Migration: Add scheduling fields to appointment_services
-- Purpose: Each service within an order can have its own time (same day, different staff/times possible)

ALTER TABLE janastudio.appointment_services
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

CREATE INDEX IF NOT EXISTS appointment_services_scheduled_at_idx ON janastudio.appointment_services(scheduled_at);
CREATE INDEX IF NOT EXISTS appointment_services_staff_scheduled_idx ON janastudio.appointment_services(staff_id, scheduled_at);
