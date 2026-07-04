-- =====================================================
-- PASO 1: Exportar datos del proyecto VIEJO
-- Correr estos queries UNO POR UNO en el SQL Editor del proyecto viejo
-- Copiar el resultado de cada uno
-- =====================================================

-- 1. STAFF (ejecutar primero)
SELECT string_agg(
  FORMAT('INSERT INTO staff (id,auth_user_id,email,name,role,commission_pct,active,created_at,image_url,phone,address,tools,washing_rate,birth_date,username,password) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
    id, auth_user_id, email, name, role, commission_pct, active, created_at,
    image_url, phone, address, tools::text, washing_rate, birth_date, username, password),
  E'\n'
) FROM staff;

-- 2. SERVICES
SELECT string_agg(
  FORMAT('INSERT INTO services (id,name,price,duration_minutes,commission_barber,commission_washer,commission_cashier,commission_receptionist,included_items,active,created_at,base_cost,variable_cost,selling_price,category,strategy) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
    id, name, price, duration_minutes, commission_barber, commission_washer, commission_cashier, commission_receptionist,
    included_items::text, active, created_at, base_cost, variable_cost, selling_price, category, strategy),
  E'\n'
) FROM services;

-- 3. SERVICE_EXTRAS
SELECT string_agg(
  FORMAT('INSERT INTO service_extras (id,name,price,commission_pct,active,created_at) VALUES (%L,%L,%L,%L,%L,%L);',
    id, name, price, commission_pct, active, created_at),
  E'\n'
) FROM service_extras;

-- 4. SERVICE_CATEGORIES
SELECT string_agg(
  FORMAT('INSERT INTO service_categories (id,name,created_at) VALUES (%L,%L,%L);',
    id, name, created_at),
  E'\n'
) FROM service_categories;

-- 5. SERVICE_STRATEGIES
SELECT string_agg(
  FORMAT('INSERT INTO service_strategies (id,name,description,formula,created_at) VALUES (%L,%L,%L,%L,%L);',
    id, name, description, formula, created_at),
  E'\n'
) FROM service_strategies;

-- 6. CLIENTS
SELECT string_agg(
  FORMAT('INSERT INTO clients (id,name,phone,id_card,created_at,birth_date,hair_type,scalp_type,active,recurrence_enabled,recurrence_days,recurrence_last_sent_at,created_by_staff_id) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
    id, name, phone, id_card, created_at, birth_date, hair_type, scalp_type, active,
    recurrence_enabled, recurrence_days, recurrence_last_sent_at, created_by_staff_id),
  E'\n'
) FROM clients;

-- 7. INVENTORY
SELECT string_agg(
  FORMAT('INSERT INTO inventory (id,name,category,stock,cost,price,unit,is_for_sale,image_url,commission_pct,staff_id,active,created_at,updated_at) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
    id, name, category, stock, cost, price, unit, is_for_sale, image_url, commission_pct, staff_id, active, created_at, updated_at),
  E'\n'
) FROM inventory;

-- 8. APPOINTMENTS (ultimos 6 meses)
SELECT string_agg(
  FORMAT('INSERT INTO appointments (id,client_id,staff_id,service_id,status,total_price,scheduled_at,started_at,completed_at,created_at,exchange_rate,notes,created_by_staff_id) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
    id, client_id, staff_id, service_id, status, total_price, scheduled_at, started_at, completed_at, created_at, exchange_rate, notes, created_by_staff_id),
  E'\n'
) FROM appointments WHERE created_at >= (now() - interval '6 months');

-- 9. APPOINTMENT_STAFF
SELECT string_agg(
  FORMAT('INSERT INTO appointment_staff (id,appointment_id,staff_id,commission_earned,product_commission,tip_amount) VALUES (%L,%L,%L,%L,%L,%L);',
    id, appointment_id, staff_id, commission_earned, product_commission, tip_amount),
  E'\n'
) FROM appointment_staff WHERE appointment_id IN (SELECT id FROM appointments WHERE created_at >= (now() - interval '6 months'));

-- 10. APPOINTMENT_EXTRAS
SELECT string_agg(
  FORMAT('INSERT INTO appointment_extras (id,appointment_id,extra_id,price) VALUES (%L,%L,%L,%L);',
    id, appointment_id, extra_id, price),
  E'\n'
) FROM appointment_extras WHERE appointment_id IN (SELECT id FROM appointments WHERE created_at >= (now() - interval '6 months'));

-- 11. APPOINTMENT_PRODUCTS
SELECT string_agg(
  FORMAT('INSERT INTO appointment_products (id,appointment_id,product_id,quantity,price) VALUES (%L,%L,%L,%L,%L);',
    id, appointment_id, product_id, quantity, price),
  E'\n'
) FROM appointment_products WHERE appointment_id IN (SELECT id FROM appointments WHERE created_at >= (now() - interval '6 months'));

-- 12. TRANSACTIONS (ultimos 6 meses)
SELECT string_agg(
  FORMAT('INSERT INTO transactions (id,description,amount,type,category,exchange_rate,currency,metadata,created_at,created_by_staff_id,idempotency_key,client_id,staff_id) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L);',
    id, description, amount, type, category, exchange_rate, currency, metadata::text, created_at, created_by_staff_id, idempotency_key, client_id, staff_id),
  E'\n'
) FROM transactions WHERE created_at >= (now() - interval '6 months');

-- 13. INVENTORY_MOVEMENTS (ultimos 6 meses)
SELECT string_agg(
  FORMAT('INSERT INTO inventory_movements (id,product_id,type,amount,reason,staff_id,created_at) VALUES (%L,%L,%L,%L,%L,%L,%L);',
    id, product_id, type, amount, reason, staff_id, created_at),
  E'\n'
) FROM inventory_movements WHERE created_at >= (now() - interval '6 months');
