-- =========================================================================
-- Migration: Register Brows/Cejas Services and Insumos
-- Description: Inserts brow services, inventory items (insumos), and maps
--              them in the service_costs table for profitability reporting.
-- =========================================================================

-- 1. Insert services into janastudio.services
insert into janastudio.services (name, price, duration_minutes, category, commission_pct, description) values
('Depilación de cejas', 7.00, 20, 'Cejas', 40, 'Depilación clásica de cejas con cera e insumos correspondientes'),
('Diseño de cejas', 12.00, 35, 'Cejas', 40, 'Diseño personalizado de cejas con henna y perfilado'),
('Laminado de cejas', 18.00, 45, 'Cejas', 40, 'Laminado estructurado para cejas rebeldes'),
('Laminado de cejas con pigmento', 23.00, 60, 'Cejas', 40, 'Laminado completo con tinte/pigmento integrado'),
('Solo depilación de bozo', 2.00, 15, 'Cejas', 40, 'Depilación express de área de bozo'),
('Axilas con cera', 10.00, 20, 'Cejas', 40, 'Depilación con cera para axilas'),
('Barba con cera', 4.00, 20, 'Cejas', 40, 'Perfilado y depilación con cera en área de barba'),
('Patillas con cera', 4.00, 15, 'Cejas', 40, 'Depilación con cera en patillas'),
('Frente con cera', 6.00, 20, 'Cejas', 40, 'Depilación con cera en área de frente'),
('Lifting de pestañas', 25.00, 60, 'Pestañas', 40, 'Rizado y realce de pestañas naturales con hidratación')
on conflict do nothing;

-- 2. Insert materials into janastudio.inventory (category 'Insumos Cejas/Cera')
insert into janastudio.inventory (name, category, stock, cost, price, unit, is_for_sale) values
('Cera Depilatoria Cejas (gr)', 'Insumos Cejas/Cera', 1000, 0.05, 0, 'gr', false),
('Espuma Limpiadora Facial', 'Insumos Cejas/Cera', 100, 0.15, 0, 'ml', false),
('Palito de Naranjo', 'Insumos Cejas/Cera', 500, 0.03, 0, 'unidad', false),
('Hojillas de Afeitar Perfiladoras', 'Insumos Cejas/Cera', 300, 0.12, 0, 'unidad', false),
('Gel de Aloe Vera', 'Insumos Cejas/Cera', 100, 0.08, 0, 'ml', false),
('Lápiz de Visagismo', 'Insumos Cejas/Cera', 50, 0.20, 0, 'unidad', false),
('Bandana Depilatoria Cejas', 'Insumos Cejas/Cera', 500, 0.04, 0, 'unidad', false),
('Exfoliante Facial Cejas', 'Insumos Cejas/Cera', 100, 0.10, 0, 'ml', false),
('Gel Fijador de Cejas', 'Insumos Cejas/Cera', 100, 0.12, 0, 'ml', false),
('Hisopos Algodón', 'Insumos Cejas/Cera', 2000, 0.01, 0, 'unidad', false),
('Corrector de Cejas', 'Insumos Cejas/Cera', 50, 0.25, 0, 'ml', false),
('Henna para Cejas Tono Medio', 'Insumos Cejas/Cera', 100, 0.35, 0, 'ml', false),
('Toallín Desechable', 'Insumos Cejas/Cera', 1000, 0.06, 0, 'unidad', false),
('Microbrush Cejas', 'Insumos Cejas/Cera', 500, 0.02, 0, 'unidad', false),
('Paso 1 Laminado (Dosis)', 'Insumos Cejas/Cera', 200, 0.80, 0, 'dosis', false),
('Paso 2 Laminado (Dosis)', 'Insumos Cejas/Cera', 200, 0.80, 0, 'dosis', false),
('Botox Hidratación Pestañas/Cejas', 'Insumos Cejas/Cera', 100, 1.20, 0, 'ml', false),
('Paleta Depilatoria Corporal', 'Insumos Cejas/Cera', 500, 0.05, 0, 'unidad', false)
on conflict do nothing;

-- 3. Link Services with their respective insumos in janastudio.service_costs
do $$
declare
  s_depil_cejas uuid;
  s_diseno_cejas uuid;
  s_lamin_cejas uuid;
  s_lamin_pigment uuid;
  s_bozo uuid;
  s_axilas uuid;
  s_barba uuid;
  s_patillas uuid;
  s_frente uuid;
  s_lifting uuid;

  i_cera uuid;
  i_espuma uuid;
  i_palito uuid;
  i_hojilla uuid;
  i_aloe uuid;
  i_lapiz uuid;
  i_bandana uuid;
  i_exfoliante uuid;
  i_fijador uuid;
  i_hisopos uuid;
  i_corrector uuid;
  i_henna uuid;
  i_toallin uuid;
  i_microbrush uuid;
  i_paso1 uuid;
  i_paso2 uuid;
  i_botox uuid;
  i_paleta uuid;
begin
  -- Retrieve service UUIDs
  select id into s_depil_cejas from janastudio.services where name = 'Depilación de cejas' limit 1;
  select id into s_diseno_cejas from janastudio.services where name = 'Diseño de cejas' limit 1;
  select id into s_lamin_cejas from janastudio.services where name = 'Laminado de cejas' limit 1;
  select id into s_lamin_pigment from janastudio.services where name = 'Laminado de cejas con pigmento' limit 1;
  select id into s_bozo from janastudio.services where name = 'Solo depilación de bozo' limit 1;
  select id into s_axilas from janastudio.services where name = 'Axilas con cera' limit 1;
  select id into s_barba from janastudio.services where name = 'Barba con cera' limit 1;
  select id into s_patillas from janastudio.services where name = 'Patillas con cera' limit 1;
  select id into s_frente from janastudio.services where name = 'Frente con cera' limit 1;
  select id into s_lifting from janastudio.services where name = 'Lifting de pestañas' limit 1;

  -- Retrieve inventory item UUIDs
  select id into i_cera from janastudio.inventory where name = 'Cera Depilatoria Cejas (gr)' limit 1;
  select id into i_espuma from janastudio.inventory where name = 'Espuma Limpiadora Facial' limit 1;
  select id into i_palito from janastudio.inventory where name = 'Palito de Naranjo' limit 1;
  select id into i_hojilla from janastudio.inventory where name = 'Hojillas de Afeitar Perfiladoras' limit 1;
  select id into i_aloe from janastudio.inventory where name = 'Gel de Aloe Vera' limit 1;
  select id into i_lapiz from janastudio.inventory where name = 'Lápiz de Visagismo' limit 1;
  select id into i_bandana from janastudio.inventory where name = 'Bandana Depilatoria Cejas' limit 1;
  select id into i_exfoliante from janastudio.inventory where name = 'Exfoliante Facial Cejas' limit 1;
  select id into i_fijador from janastudio.inventory where name = 'Gel Fijador de Cejas' limit 1;
  select id into i_hisopos from janastudio.inventory where name = 'Hisopos Algodón' limit 1;
  select id into i_corrector from janastudio.inventory where name = 'Corrector de Cejas' limit 1;
  select id into i_henna from janastudio.inventory where name = 'Henna para Cejas Tono Medio' limit 1;
  select id into i_toallin from janastudio.inventory where name = 'Toallín Desechable' limit 1;
  select id into i_microbrush from janastudio.inventory where name = 'Microbrush Cejas' limit 1;
  select id into i_paso1 from janastudio.inventory where name = 'Paso 1 Laminado (Dosis)' limit 1;
  select id into i_paso2 from janastudio.inventory where name = 'Paso 2 Laminado (Dosis)' limit 1;
  select id into i_botox from janastudio.inventory where name = 'Botox Hidratación Pestañas/Cejas' limit 1;
  select id into i_paleta from janastudio.inventory where name = 'Paleta Depilatoria Corporal' limit 1;

  -- Clear previous mapping to avoid duplicate records if run again
  delete from janastudio.service_costs where service_id in (
    s_depil_cejas, s_diseno_cejas, s_lamin_cejas, s_lamin_pigment,
    s_bozo, s_axilas, s_barba, s_patillas, s_frente, s_lifting
  );

  -- A: Depilación de Cejas (Costo total aprox: $0.35)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_depil_cejas, i_cera, 'Cera Depilatoria Cejas (gr)', 10, 0.05, 'gr'),
  (s_depil_cejas, i_espuma, 'Espuma Limpiadora Facial', 2, 0.15, 'ml'),
  (s_depil_cejas, i_palito, 'Palito de Naranjo', 0.33, 0.03, 'unidad'), -- 1 cada 3 clientes
  (s_depil_cejas, i_hojilla, 'Hojillas de Afeitar Perfiladoras', 0.33, 0.12, 'unidad'), -- 1 cada 3 clientes
  (s_depil_cejas, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_depil_cejas, i_lapiz, 'Lápiz de Visagismo', 0.1, 0.20, 'unidad'),
  (s_depil_cejas, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_depil_cejas, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml'),
  (s_depil_cejas, i_fijador, 'Gel Fijador de Cejas', 1, 0.12, 'ml'),
  (s_depil_cejas, i_hisopos, 'Hisopos Algodón', 4, 0.01, 'unidad');

  -- B: Diseño de Cejas (Costo total aprox: $0.98)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_diseno_cejas, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml'),
  (s_diseno_cejas, i_espuma, 'Espuma Limpiadora Facial', 2, 0.15, 'ml'),
  (s_diseno_cejas, i_lapiz, 'Lápiz de Visagismo', 0.1, 0.20, 'unidad'),
  (s_diseno_cejas, i_palito, 'Palito de Naranjo', 0.33, 0.03, 'unidad'),
  (s_diseno_cejas, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_diseno_cejas, i_cera, 'Cera Depilatoria Cejas (gr)', 10, 0.05, 'gr'),
  (s_diseno_cejas, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_diseno_cejas, i_fijador, 'Gel Fijador de Cejas', 1, 0.12, 'ml'),
  (s_diseno_cejas, i_corrector, 'Corrector de Cejas', 1, 0.25, 'ml'),
  (s_diseno_cejas, i_henna, 'Henna para Cejas Tono Medio', 1, 0.35, 'ml'),
  (s_diseno_cejas, i_toallin, 'Toallín Desechable', 1, 0.06, 'unidad'),
  (s_diseno_cejas, i_hojilla, 'Hojillas de Afeitar Perfiladoras', 0.33, 0.12, 'unidad'),
  (s_diseno_cejas, i_hisopos, 'Hisopos Algodón', 6, 0.01, 'unidad'),
  (s_diseno_cejas, i_microbrush, 'Microbrush Cejas', 2, 0.02, 'unidad');

  -- C: Laminado de Cejas (Costo total aprox: $2.40)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_lamin_cejas, i_espuma, 'Espuma Limpiadora Facial', 2, 0.15, 'ml'),
  (s_lamin_cejas, i_lapiz, 'Lápiz de Visagismo', 0.1, 0.20, 'unidad'),
  (s_lamin_cejas, i_palito, 'Palito de Naranjo', 0.33, 0.03, 'unidad'),
  (s_lamin_cejas, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_lamin_cejas, i_cera, 'Cera Depilatoria Cejas (gr)', 10, 0.05, 'gr'),
  (s_lamin_cejas, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_lamin_cejas, i_fijador, 'Gel Fijador de Cejas', 1, 0.12, 'ml'),
  (s_lamin_cejas, i_corrector, 'Corrector de Cejas', 1, 0.25, 'ml'),
  (s_lamin_cejas, i_toallin, 'Toallín Desechable', 1, 0.06, 'unidad'),
  (s_lamin_cejas, i_hojilla, 'Hojillas de Afeitar Perfiladoras', 0.33, 0.12, 'unidad'),
  (s_lamin_cejas, i_paso1, 'Paso 1 Laminado (Dosis)', 1, 0.80, 'dosis'),
  (s_lamin_cejas, i_paso2, 'Paso 2 Laminado (Dosis)', 1, 0.80, 'dosis'),
  (s_lamin_cejas, i_botox, 'Botox Hidratación Pestañas/Cejas', 0.25, 1.20, 'ml'),
  (s_lamin_cejas, i_microbrush, 'Microbrush Cejas', 2, 0.02, 'unidad'),
  (s_lamin_cejas, i_hisopos, 'Hisopos Algodón', 6, 0.01, 'unidad');

  -- D: Laminado de Cejas con Pigmento (Costo total aprox: $2.75)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_lamin_pigment, i_espuma, 'Espuma Limpiadora Facial', 2, 0.15, 'ml'),
  (s_lamin_pigment, i_lapiz, 'Lápiz de Visagismo', 0.1, 0.20, 'unidad'),
  (s_lamin_pigment, i_palito, 'Palito de Naranjo', 0.33, 0.03, 'unidad'),
  (s_lamin_pigment, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_lamin_pigment, i_cera, 'Cera Depilatoria Cejas (gr)', 10, 0.05, 'gr'),
  (s_lamin_pigment, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_lamin_pigment, i_fijador, 'Gel Fijador de Cejas', 1, 0.12, 'ml'),
  (s_lamin_pigment, i_corrector, 'Corrector de Cejas', 1, 0.25, 'ml'),
  (s_lamin_pigment, i_henna, 'Henna para Cejas Tono Medio', 1, 0.35, 'ml'),
  (s_lamin_pigment, i_toallin, 'Toallín Desechable', 1, 0.06, 'unidad'),
  (s_lamin_pigment, i_hojilla, 'Hojillas de Afeitar Perfiladoras', 0.33, 0.12, 'unidad'),
  (s_lamin_pigment, i_paso1, 'Paso 1 Laminado (Dosis)', 1, 0.80, 'dosis'),
  (s_lamin_pigment, i_paso2, 'Paso 2 Laminado (Dosis)', 1, 0.80, 'dosis'),
  (s_lamin_pigment, i_botox, 'Botox Hidratación Pestañas/Cejas', 0.25, 1.20, 'ml'),
  (s_lamin_pigment, i_microbrush, 'Microbrush Cejas', 2, 0.02, 'unidad'),
  (s_lamin_pigment, i_hisopos, 'Hisopos Algodón', 6, 0.01, 'unidad');

  -- E: Solo Depilación de Bozo (Costo total aprox: $0.15)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_bozo, i_palito, 'Palito de Naranjo', 0.33, 0.03, 'unidad'),
  (s_bozo, i_cera, 'Cera Depilatoria Cejas (gr)', 5, 0.05, 'gr'),
  (s_bozo, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_bozo, i_aloe, 'Gel de Aloe Vera', 1, 0.08, 'ml');

  -- F: Axilas con Cera (Costo total aprox: $0.25)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_axilas, i_paleta, 'Paleta Depilatoria Corporal', 1, 0.05, 'unidad'),
  (s_axilas, i_cera, 'Cera Depilatoria Cejas (gr)', 15, 0.05, 'gr'),
  (s_axilas, i_bandana, 'Bandana Depilatoria Cejas', 2, 0.04, 'unidad'),
  (s_axilas, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_axilas, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml');

  -- G: Barba con Cera (Costo total aprox: $0.28)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_barba, i_palito, 'Palito de Naranjo', 1, 0.03, 'unidad'),
  (s_barba, i_cera, 'Cera Depilatoria Cejas (gr)', 15, 0.05, 'gr'),
  (s_barba, i_bandana, 'Bandana Depilatoria Cejas', 2, 0.04, 'unidad'),
  (s_barba, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_barba, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml');

  -- H: Patillas con Cera (Costo total aprox: $0.20)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_patillas, i_palito, 'Palito de Naranjo', 1, 0.03, 'unidad'),
  (s_patillas, i_cera, 'Cera Depilatoria Cejas (gr)', 10, 0.05, 'gr'),
  (s_patillas, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_patillas, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_patillas, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml');

  -- I: Frente con Cera (Costo total aprox: $0.20)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_frente, i_palito, 'Palito de Naranjo', 1, 0.03, 'unidad'),
  (s_frente, i_cera, 'Cera Depilatoria Cejas (gr)', 10, 0.05, 'gr'),
  (s_frente, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_frente, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_frente, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml');

  -- J: Lifting de Pestañas (Costo total aprox: $2.60)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_lifting, i_paso1, 'Paso 1 Laminado (Dosis)', 1, 0.80, 'dosis'),
  (s_lifting, i_paso2, 'Paso 2 Laminado (Dosis)', 1, 0.80, 'dosis'),
  (s_lifting, i_botox, 'Botox Hidratación Pestañas/Cejas', 0.25, 1.20, 'ml'),
  (s_lifting, i_microbrush, 'Microbrush Cejas', 3, 0.02, 'unidad'),
  (s_lifting, i_hisopos, 'Hisopos Algodón', 6, 0.01, 'unidad'),
  (s_lifting, i_henna, 'Henna para Cejas Tono Medio', 1, 0.35, 'ml'),
  (s_lifting, i_toallin, 'Toallín Desechable', 1, 0.06, 'unidad'),
  (s_lifting, i_espuma, 'Espuma Limpiadora Facial', 2, 0.15, 'ml');

end $$;
