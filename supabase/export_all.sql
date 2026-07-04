-- ============================================
-- EXPORT SCRIPT: Run this in the OLD project's SQL Editor
-- It generates INSERT statements for all tables
-- Copy the output and run it in the NEW project
-- ============================================

-- 1. STAFF
SELECT 'INSERT INTO staff (id, auth_user_id, email, name, role, commission_pct, active, created_at, image_url, phone, address, tools, washing_rate, birth_date, username, password) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || auth_user_id || '''', 'NULL') || ','
    || COALESCE('''' || replace(email, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || replace(name, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || replace(role, '''', '''''') || '''', 'NULL') || ','
    || COALESCE(commission_pct::text, 'NULL') || ','
    || COALESCE(active::text, 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ','
    || COALESCE('''' || image_url || '''', 'NULL') || ','
    || COALESCE('''' || phone || '''', 'NULL') || ','
    || COALESCE('''' || replace(address, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || tools::text || '''', 'NULL') || ','
    || COALESCE(washing_rate::text, 'NULL') || ','
    || COALESCE('''' || birth_date || '''', 'NULL') || ','
    || COALESCE('''' || username || '''', 'NULL') || ','
    || COALESCE('''' || password || '''', 'NULL') || ');',
    E'\n'
  )
FROM staff;

-- 2. SERVICES
SELECT 'INSERT INTO services (id, name, price, duration_minutes, commission_barber, commission_washer, commission_cashier, commission_receptionist, included_items, active, created_at, base_cost, variable_cost, selling_price, category, strategy) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || replace(name, '''', '''''') || '''', 'NULL') || ','
    || COALESCE(price::text, 'NULL') || ','
    || COALESCE(duration_minutes::text, 'NULL') || ','
    || COALESCE(commission_barber::text, 'NULL') || ','
    || COALESCE(commission_washer::text, 'NULL') || ','
    || COALESCE(commission_cashier::text, 'NULL') || ','
    || COALESCE(commission_receptionist::text, 'NULL') || ','
    || COALESCE('''' || included_items::text || '''', 'NULL') || ','
    || COALESCE(active::text, 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ','
    || COALESCE(base_cost::text, 'NULL') || ','
    || COALESCE(variable_cost::text, 'NULL') || ','
    || COALESCE(selling_price::text, 'NULL') || ','
    || COALESCE('''' || category || '''', 'NULL') || ','
    || COALESCE('''' || strategy || '''', 'NULL') || ');',
    E'\n'
  )
FROM services;

-- 3. CLIENTS
SELECT 'INSERT INTO clients (id, name, phone, id_card, created_at, birth_date, hair_type, scalp_type, active, recurrence_enabled, recurrence_days, recurrence_last_sent_at, created_by_staff_id) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || replace(name, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || phone || '''', 'NULL') || ','
    || COALESCE('''' || id_card || '''', 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ','
    || COALESCE('''' || birth_date || '''', 'NULL') || ','
    || COALESCE('''' || hair_type || '''', 'NULL') || ','
    || COALESCE('''' || scalp_type || '''', 'NULL') || ','
    || COALESCE(active::text, 'NULL') || ','
    || COALESCE(recurrence_enabled::text, 'NULL') || ','
    || COALESCE(recurrence_days::text, 'NULL') || ','
    || COALESCE('''' || recurrence_last_sent_at::text || '''', 'NULL') || ','
    || COALESCE('''' || created_by_staff_id || '''', 'NULL') || ');',
    E'\n'
  )
FROM clients;

-- 4. APPOINTMENTS (large table - limit to recent 6 months)
SELECT 'INSERT INTO appointments (id, client_id, staff_id, service_id, status, total_price, scheduled_at, started_at, completed_at, created_at, exchange_rate, notes, created_by_staff_id) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || client_id || '''', 'NULL') || ','
    || COALESCE('''' || staff_id || '''', 'NULL') || ','
    || COALESCE('''' || service_id || '''', 'NULL') || ','
    || COALESCE('''' || status || '''', 'NULL') || ','
    || COALESCE(total_price::text, 'NULL') || ','
    || COALESCE('''' || scheduled_at::text || '''', 'NULL') || ','
    || COALESCE('''' || started_at::text || '''', 'NULL') || ','
    || COALESCE('''' || completed_at::text || '''', 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ','
    || COALESCE(exchange_rate::text, 'NULL') || ','
    || COALESCE('''' || replace(notes, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || created_by_staff_id || '''', 'NULL') || ');',
    E'\n'
  )
FROM appointments
WHERE created_at >= (now() - interval '6 months');

-- 5. APPOINTMENT_STAFF
SELECT 'INSERT INTO appointment_staff (id, appointment_id, staff_id, commission_earned, product_commission, tip_amount) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || appointment_id || '''', 'NULL') || ','
    || COALESCE('''' || staff_id || '''', 'NULL') || ','
    || COALESCE(commission_earned::text, 'NULL') || ','
    || COALESCE(product_commission::text, 'NULL') || ','
    || COALESCE(tip_amount::text, 'NULL') || ');',
    E'\n'
  )
FROM appointment_staff
WHERE appointment_id IN (SELECT id FROM appointments WHERE created_at >= (now() - interval '6 months'));

-- 6. APPOINTMENT_EXTRAS
SELECT 'INSERT INTO appointment_extras (id, appointment_id, extra_id, price) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || appointment_id || '''', 'NULL') || ','
    || COALESCE('''' || extra_id || '''', 'NULL') || ','
    || COALESCE(price::text, 'NULL') || ');',
    E'\n'
  )
FROM appointment_extras
WHERE appointment_id IN (SELECT id FROM appointments WHERE created_at >= (now() - interval '6 months'));

-- 7. APPOINTMENT_PRODUCTS
SELECT 'INSERT INTO appointment_products (id, appointment_id, product_id, quantity, price) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || appointment_id || '''', 'NULL') || ','
    || COALESCE('''' || product_id || '''', 'NULL') || ','
    || COALESCE(quantity::text, 'NULL') || ','
    || COALESCE(price::text, 'NULL') || ');',
    E'\n'
  )
FROM appointment_products
WHERE appointment_id IN (SELECT id FROM appointments WHERE created_at >= (now() - interval '6 months'));

-- 8. TRANSACTIONS (last 6 months)
SELECT 'INSERT INTO transactions (id, description, amount, type, category, exchange_rate, currency, metadata, created_at, created_by_staff_id, idempotency_key, client_id, staff_id) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || replace(description, '''', '''''') || '''', 'NULL') || ','
    || COALESCE(amount::text, 'NULL') || ','
    || COALESCE('''' || type || '''', 'NULL') || ','
    || COALESCE('''' || category || '''', 'NULL') || ','
    || COALESCE(exchange_rate::text, 'NULL') || ','
    || COALESCE('''' || currency || '''', 'NULL') || ','
    || COALESCE('''' || metadata::text || '''', 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ','
    || COALESCE('''' || created_by_staff_id || '''', 'NULL') || ','
    || COALESCE('''' || idempotency_key || '''', 'NULL') || ','
    || COALESCE('''' || client_id || '''', 'NULL') || ','
    || COALESCE('''' || staff_id || '''', 'NULL') || ');',
    E'\n'
  )
FROM transactions
WHERE created_at >= (now() - interval '6 months');

-- 9. SERVICE_EXTRAS
SELECT 'INSERT INTO service_extras (id, name, price, commission_pct, active, created_at) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || replace(name, '''', '''''') || '''', 'NULL') || ','
    || COALESCE(price::text, 'NULL') || ','
    || COALESCE(commission_pct::text, 'NULL') || ','
    || COALESCE(active::text, 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ');',
    E'\n'
  )
FROM service_extras;

-- 10. SERVICE_CATEGORIES
SELECT 'INSERT INTO service_categories (id, name, created_at) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || replace(name, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ');',
    E'\n'
  )
FROM service_categories;

-- 11. SERVICE_STRATEGIES
SELECT 'INSERT INTO service_strategies (id, name, description, formula, created_at) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || replace(name, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || replace(description, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || formula || '''', 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ');',
    E'\n'
  )
FROM service_strategies;

-- 12. INVENTORY
SELECT 'INSERT INTO inventory (id, name, category, stock, cost, price, unit, is_for_sale, image_url, commission_pct, staff_id, active, created_at, updated_at) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || replace(name, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || category || '''', 'NULL') || ','
    || COALESCE(stock::text, 'NULL') || ','
    || COALESCE(cost::text, 'NULL') || ','
    || COALESCE(price::text, 'NULL') || ','
    || COALESCE('''' || unit || '''', 'NULL') || ','
    || COALESCE(is_for_sale::text, 'NULL') || ','
    || COALESCE('''' || image_url || '''', 'NULL') || ','
    || COALESCE(commission_pct::text, 'NULL') || ','
    || COALESCE('''' || staff_id || '''', 'NULL') || ','
    || COALESCE(active::text, 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ','
    || COALESCE('''' || updated_at::text || '''', 'NULL') || ');',
    E'\n'
  )
FROM inventory;

-- 13. INVENTORY_MOVEMENTS (last 6 months)
SELECT 'INSERT INTO inventory_movements (id, product_id, type, amount, reason, staff_id, created_at) VALUES '
  || string_agg(
    '(''' || id || ''','
    || COALESCE('''' || product_id || '''', 'NULL') || ','
    || COALESCE('''' || type || '''', 'NULL') || ','
    || COALESCE(amount::text, 'NULL') || ','
    || COALESCE('''' || replace(reason, '''', '''''') || '''', 'NULL') || ','
    || COALESCE('''' || staff_id || '''', 'NULL') || ','
    || COALESCE('''' || created_at::text || '''', 'NULL') || ');',
    E'\n'
  )
FROM inventory_movements
WHERE created_at >= (now() - interval '6 months');
