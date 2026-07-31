-- Notification Queue for WhatsApp Integration
-- Creates the infrastructure to queue and track outbound notifications
SET search_path = janastudio, public;

-- 1. Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('birthday', 'reminder', 'thank_you', 'promotion', 'custom')),
  recipient_phone TEXT,
  recipient_name TEXT NOT NULL,
  recipient_client_id UUID REFERENCES janastudio.clients(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(type);
CREATE INDEX IF NOT EXISTS idx_notification_queue_client ON notification_queue(recipient_client_id);

-- 3. RLS policies
ALTER TABLE janastudio.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view notification queue" ON janastudio.notification_queue
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert notification queue" ON janastudio.notification_queue
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update notification queue" ON janastudio.notification_queue
  FOR UPDATE USING (true);

CREATE POLICY "Staff can delete notification queue" ON janastudio.notification_queue
  FOR DELETE USING (true);

-- 4. Function to get pending notifications ready to send
CREATE OR REPLACE FUNCTION janastudio.get_ready_notifications()
RETURNS TABLE (
  id UUID,
  type TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  message TEXT,
  scheduled_for TIMESTAMPTZ,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT nq.id, nq.type, nq.recipient_phone, nq.recipient_name, 
         nq.message, nq.scheduled_for, nq.metadata
  FROM janastudio.notification_queue nq
  WHERE nq.status = 'pending' 
    AND nq.scheduled_for <= NOW()
  ORDER BY nq.scheduled_for ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to mark notification as sent
CREATE OR REPLACE FUNCTION janastudio.mark_notification_sent(p_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE janastudio.notification_queue 
  SET status = 'sent', sent_at = NOW() 
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to mark notification as failed
CREATE OR REPLACE FUNCTION janastudio.mark_notification_failed(p_id UUID, p_error TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE janastudio.notification_queue 
  SET status = 'failed', error_message = p_error 
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get notification stats
CREATE OR REPLACE FUNCTION janastudio.get_notification_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pending', (SELECT COUNT(*) FROM janastudio.notification_queue WHERE status = 'pending'),
    'sent', (SELECT COUNT(*) FROM janastudio.notification_queue WHERE status = 'sent'),
    'failed', (SELECT COUNT(*) FROM janastudio.notification_queue WHERE status = 'failed'),
    'today', (SELECT COUNT(*) FROM janastudio.notification_queue WHERE created_at >= CURRENT_DATE),
    'by_type', (
      SELECT json_object_agg(type, count)
      FROM (
        SELECT type, COUNT(*) as count 
        FROM janastudio.notification_queue 
        WHERE status = 'pending'
        GROUP BY type
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to queue birthday notifications for today
CREATE OR REPLACE FUNCTION janastudio.queue_birthday_notifications()
RETURNS INTEGER AS $$
DECLARE
  client_record RECORD;
  notification_count INTEGER := 0;
  birthday_message TEXT;
BEGIN
  FOR client_record IN
    SELECT c.id, c.name, c.phone
    FROM janastudio.clients c
    WHERE c.birth_date IS NOT NULL
      AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM c.birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
      AND c.phone IS NOT NULL
      AND c.phone != ''
  LOOP
    birthday_message := '¡Feliz cumpleaños, ' || client_record.name || '! 🎂🎉 En JanaStudio queremos celebrar contigo. ¡Disfruta tu día especial!';
    
    INSERT INTO janastudio.notification_queue (type, recipient_phone, recipient_name, recipient_client_id, message, scheduled_for, metadata)
    VALUES ('birthday', client_record.phone, client_record.name, client_record.id, birthday_message, NOW(), jsonb_build_object('auto_generated', true, 'source', 'daily_check'));
    
    notification_count := notification_count + 1;
  END LOOP;
  
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to queue laser reminders (19 days before next session)
CREATE OR REPLACE FUNCTION janastudio.queue_laser_reminders()
RETURNS INTEGER AS $$
DECLARE
  pkg_record RECORD;
  notification_count INTEGER := 0;
  reminder_message TEXT;
  next_session_date DATE;
BEGIN
  FOR pkg_record IN
    SELECT cp.id as package_id, cp.client_id, cp.total_sessions, cp.used_sessions,
           cp.session_interval_days, c.name, c.phone,
           ps.scheduled_at as last_session_date
    FROM janastudio.client_packages cp
    JOIN janastudio.clients c ON c.id = cp.client_id
    LEFT JOIN janastudio.package_sessions ps ON ps.client_package_id = cp.id
    WHERE cp.status = 'active'
      AND c.phone IS NOT NULL
      AND c.phone != ''
      AND (cp.total_sessions - cp.used_sessions) > 0
  LOOP
    -- Calculate next session date
    IF pkg_record.last_session_date IS NOT NULL THEN
      next_session_date := pkg_record.last_session_date::date + (pkg_record.session_interval_days || ' days')::interval;
    ELSE
      next_session_date := CURRENT_DATE + (pkg_record.session_interval_days || ' days')::interval;
    END IF;
    
    -- Check if next session is in 19 days (±1 day tolerance)
    IF next_session_date BETWEEN CURRENT_DATE + INTERVAL '18 days' AND CURRENT_DATE + INTERVAL '20 days' THEN
      reminder_message := 'Hola ' || pkg_record.name || ', ¡tu próxima sesión de láser está cerca! 📅 Te recordamos que tu cita es el ' || 
                          TO_CHAR(next_session_date, 'DD/MM/YYYY') || '. ¡Te esperamos en JanaStudio!';
      
      INSERT INTO janastudio.notification_queue (type, recipient_phone, recipient_name, recipient_client_id, message, scheduled_for, metadata)
      VALUES ('reminder', pkg_record.phone, pkg_record.name, pkg_record.client_id, reminder_message, NOW(), 
              jsonb_build_object('auto_generated', true, 'source', 'daily_check', 'package_id', pkg_record.package_id, 'next_session', next_session_date));
      
      notification_count := notification_count + 1;
    END IF;
  END LOOP;
  
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to get clients with birthdays today (for manual triggers)
CREATE OR REPLACE FUNCTION janastudio.get_clients_with_birthdays_today()
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  turning_age INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.phone,
         EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.birth_date))::INTEGER + 1
  FROM janastudio.clients c
  WHERE c.birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM c.birth_date) = EXTRACT(DAY FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to get laser packages needing reminders
CREATE OR REPLACE FUNCTION janastudio.get_laser_packages_needing_reminder()
RETURNS TABLE (
  package_id UUID,
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  service_name TEXT,
  sessions_remaining INTEGER,
  next_session_date DATE
) AS $$
DECLARE
  pkg_record RECORD;
  next_date DATE;
BEGIN
  FOR pkg_record IN
    SELECT cp.id, cp.client_id, cp.total_sessions, cp.used_sessions,
           cp.session_interval_days, c.name, c.phone, s.name as service_name,
           ps.scheduled_at as last_session_date
    FROM janastudio.client_packages cp
    JOIN janastudio.clients c ON c.id = cp.client_id
    JOIN janastudio.services s ON s.id = cp.service_id
    LEFT JOIN janastudio.package_sessions ps ON ps.client_package_id = cp.id
    WHERE cp.status = 'active'
      AND (cp.total_sessions - cp.used_sessions) > 0
  LOOP
    IF pkg_record.last_session_date IS NOT NULL THEN
      next_date := pkg_record.last_session_date::date + (pkg_record.session_interval_days || ' days')::interval;
    ELSE
      next_date := CURRENT_DATE + (pkg_record.session_interval_days || ' days')::interval;
    END IF;
    
    IF next_date BETWEEN CURRENT_DATE + INTERVAL '18 days' AND CURRENT_DATE + INTERVAL '20 days' THEN
      package_id := pkg_record.id;
      client_id := pkg_record.client_id;
      client_name := pkg_record.name;
      client_phone := pkg_record.phone;
      service_name := pkg_record.service_name;
      sessions_remaining := pkg_record.total_sessions - pkg_record.used_sessions;
      next_session_date := next_date;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Seed default notification templates in system_settings
INSERT INTO janastudio.system_settings (key, value, updated_at)
VALUES 
  ('notif_template_birthday', '¡Feliz cumpleaños, {{name}}! 🎂🎉 En JanaStudio queremos celebrar contigo. ¡Disfruta tu día especial!', NOW()),
  ('notif_template_reminder', 'Hola {{name}}, ¡tu próxima sesión de láser está cerca! 📅 Te recordamos que tu cita es el {{date}}. ¡Te esperamos en JanaStudio!', NOW()),
  ('notif_template_thank_you', '¡Gracias por confiar en JanaStudio, {{name}}! 💖 Esperamos verte pronto. ¿Qué tal tu experiencia con nosotros?', NOW()),
  ('notif_template_promotion', '¡Hola {{name}}! 🌟 Tienes una promo especial en JanaStudio: {{promo_details}}. ¡No te la pierdas!', NOW())
ON CONFLICT (key) DO NOTHING;
