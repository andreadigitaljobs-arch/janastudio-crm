-- =========================================================================
-- INSTALADOR COMPLETO DE SERVICIOS REALES (CEJAS Y UÑAS)
-- Instrucciones: 
-- 1. Copia todo este código.
-- 2. Ve a tu panel de Supabase (SQL Editor).
-- 3. Pégalo y presiona "Run".
-- =========================================================================

-- PASO 1: LIMPIEZA DE DATOS FALSOS
-- Borramos las conexiones de costos, luego los servicios y el inventario.
delete from janastudio.service_costs;
delete from janastudio.services;
delete from janastudio.inventory;

-- =========================================================================
-- PASO 2: SERVICIOS DE CEJAS (Extraído de imágenes 1 a 6)
-- =========================================================================

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

do $$
declare
  s_depil_cejas uuid; s_diseno_cejas uuid; s_lamin_cejas uuid; s_lamin_pigment uuid;
  s_bozo uuid; s_axilas uuid; s_barba uuid; s_patillas uuid; s_frente uuid; s_lifting uuid;
  i_cera uuid; i_espuma uuid; i_palito uuid; i_hojilla uuid; i_aloe uuid; i_lapiz uuid;
  i_bandana uuid; i_exfoliante uuid; i_fijador uuid; i_hisopos uuid; i_corrector uuid;
  i_henna uuid; i_toallin uuid; i_microbrush uuid; i_paso1 uuid; i_paso2 uuid;
  i_botox uuid; i_paleta uuid;
begin
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

  -- A: Depilación de Cejas
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_depil_cejas, i_cera, 'Cera Depilatoria Cejas (gr)', 10, 0.05, 'gr'),
  (s_depil_cejas, i_espuma, 'Espuma Limpiadora Facial', 2, 0.15, 'ml'),
  (s_depil_cejas, i_palito, 'Palito de Naranjo', 0.33, 0.03, 'unidad'), 
  (s_depil_cejas, i_hojilla, 'Hojillas de Afeitar Perfiladoras', 0.33, 0.12, 'unidad'), 
  (s_depil_cejas, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_depil_cejas, i_lapiz, 'Lápiz de Visagismo', 0.1, 0.20, 'unidad'),
  (s_depil_cejas, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_depil_cejas, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml'),
  (s_depil_cejas, i_fijador, 'Gel Fijador de Cejas', 1, 0.12, 'ml'),
  (s_depil_cejas, i_hisopos, 'Hisopos Algodón', 4, 0.01, 'unidad');

  -- B: Diseño de Cejas
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

  -- C: Laminado de Cejas
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

  -- D: Laminado con Pigmento
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

  -- E a I
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_bozo, i_palito, 'Palito de Naranjo', 0.33, 0.03, 'unidad'),
  (s_bozo, i_cera, 'Cera Depilatoria Cejas (gr)', 5, 0.05, 'gr'),
  (s_bozo, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_bozo, i_aloe, 'Gel de Aloe Vera', 1, 0.08, 'ml'),
  (s_axilas, i_paleta, 'Paleta Depilatoria Corporal', 1, 0.05, 'unidad'),
  (s_axilas, i_cera, 'Cera Depilatoria Cejas (gr)', 15, 0.05, 'gr'),
  (s_axilas, i_bandana, 'Bandana Depilatoria Cejas', 2, 0.04, 'unidad'),
  (s_axilas, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_axilas, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml'),
  (s_barba, i_palito, 'Palito de Naranjo', 1, 0.03, 'unidad'),
  (s_barba, i_cera, 'Cera Depilatoria Cejas (gr)', 15, 0.05, 'gr'),
  (s_barba, i_bandana, 'Bandana Depilatoria Cejas', 2, 0.04, 'unidad'),
  (s_barba, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_barba, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml'),
  (s_patillas, i_palito, 'Palito de Naranjo', 1, 0.03, 'unidad'),
  (s_patillas, i_cera, 'Cera Depilatoria Cejas (gr)', 10, 0.05, 'gr'),
  (s_patillas, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_patillas, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_patillas, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml'),
  (s_frente, i_palito, 'Palito de Naranjo', 1, 0.03, 'unidad'),
  (s_frente, i_cera, 'Cera Depilatoria Cejas (gr)', 10, 0.05, 'gr'),
  (s_frente, i_bandana, 'Bandana Depilatoria Cejas', 1, 0.04, 'unidad'),
  (s_frente, i_aloe, 'Gel de Aloe Vera', 2, 0.08, 'ml'),
  (s_frente, i_exfoliante, 'Exfoliante Facial Cejas', 2, 0.10, 'ml');

  -- J: Lifting
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

-- =========================================================================
-- PASO 3: SERVICIOS DE UÑAS (Extraído de imágenes de manicura/pedicura)
-- =========================================================================

insert into janastudio.services (name, price, duration_minutes, category, commission_pct, description) values
('Manicura Tradicional sin lámpara', 15.00, 60, 'Uñas', 40, 'Manicura clásica sin uso de lámpara UV'),
('Manicura Semipermanente', 15.00, 60, 'Uñas', 40, 'Manicura con esmaltado semipermanente de larga duración'),
('Manicura Semipermanente + Nivelación', 18.00, 90, 'Uñas', 40, 'Esmaltado semipermanente con base rubber para nivelar la uña natural'),
('Manicura Builder Gel', 20.00, 90, 'Uñas', 40, 'Estructuración y refuerzo con builder gel'),
('Sistema Dip Powder (Kapping)', 18.00, 100, 'Uñas', 40, 'Recubrimiento con polvo acrílico sin monómero (kapping)'),
('Sistema Polygel', 20.00, 100, 'Uñas', 40, 'Extensión o refuerzo usando polygel'),
('Manicura Jelly Express', 20.00, 90, 'Uñas', 40, 'Aplicación rápida con uñas jelly preformadas'),
('Sistema Acrílico', 22.00, 120, 'Uñas', 40, 'Construcción de uñas con acrílico y monómero'),
('Uñas Esculpidas', 22.00, 120, 'Uñas', 40, 'Construcción esculpida de uñas (polygel/monómero)'),
('Remoción de acrílicos/sistemas', 4.00, 20, 'Uñas', 0, 'Retiro seguro de sistemas artificiales'),
('Diseños elaborados (pinceladas)', 2.00, 20, 'Uñas', 40, 'Diseños artísticos a mano alzada (adicional)'),
('Uñas largo L', 2.00, 10, 'Uñas', 40, 'Cargo adicional por longitud extrema (L)'),
('Uña por unidad (reparación)', 2.00, 15, 'Uñas', 40, 'Reparación o aplicación de una sola uña'),
('Jelly Spa Adicional', 5.00, 15, 'Uñas', 40, 'Tratamiento relajante jelly spa'),
('Pedicura Tradicional', 18.00, 60, 'Uñas', 40, 'Limpieza y esmaltado tradicional en pies'),
('Pedicura Semipermanente', 18.00, 60, 'Uñas', 40, 'Limpieza y esmaltado semipermanente en pies')
on conflict do nothing;

insert into janastudio.inventory (name, category, stock, cost, price, unit, is_for_sale) values
('Esmalte Tradicional (Masglow)', 'Insumos Uñas', 50, 0.20, 0, 'ml', false),
('Esmalte Semipermanente', 'Insumos Uñas', 100, 0.35, 0, 'ml', false),
('Serum de Uñas', 'Insumos Uñas', 50, 0.15, 0, 'ml', false),
('Serum Brillante de Manos', 'Insumos Uñas', 100, 0.25, 0, 'ml', false),
('Base Rubber', 'Insumos Uñas', 50, 0.40, 0, 'ml', false),
('Builder Gel', 'Insumos Uñas', 50, 0.50, 0, 'gr', false),
('Polvo Acrílico', 'Insumos Uñas', 1000, 0.30, 0, 'gr', false),
('Monómero', 'Insumos Uñas', 500, 0.40, 0, 'ml', false),
('Polygel', 'Insumos Uñas', 200, 0.45, 0, 'gr', false),
('Uñas Jelly (Tips)', 'Insumos Uñas', 500, 0.10, 0, 'unidad', false),
('Removedor de Sistemas', 'Insumos Uñas', 1000, 0.25, 0, 'ml', false),
('Jelly Spa (Polvo)', 'Insumos Uñas', 200, 0.80, 0, 'sobres', false),
('Exfoliante de Pies', 'Insumos Uñas', 500, 0.20, 0, 'ml', false),
('Crema de Pies', 'Insumos Uñas', 500, 0.15, 0, 'ml', false),
('Jabón de Pies', 'Insumos Uñas', 1000, 0.10, 0, 'ml', false)
on conflict do nothing;

do $$
declare
  s_tradicional uuid; s_semi uuid; s_nivelacion uuid; s_builder uuid;
  s_dip uuid; s_polygel uuid; s_jelly uuid; s_acrilico uuid; s_esculpidas uuid;
  s_remocion uuid; s_diseno uuid; s_una_unidad uuid; s_jelly_spa uuid;
  s_pedi_trad uuid; s_pedi_semi uuid;
  i_masglow uuid; i_semi uuid; i_serum_u uuid; i_serum_m uuid;
  i_rubber uuid; i_builder uuid; i_acrilico uuid; i_monomero uuid; i_polygel uuid;
  i_jelly_tips uuid; i_removedor uuid; i_jelly_spa uuid;
  i_exfoliante uuid; i_crema uuid; i_jabon uuid;
begin
  select id into s_tradicional from janastudio.services where name = 'Manicura Tradicional sin lámpara' limit 1;
  select id into s_semi from janastudio.services where name = 'Manicura Semipermanente' limit 1;
  select id into s_nivelacion from janastudio.services where name = 'Manicura Semipermanente + Nivelación' limit 1;
  select id into s_builder from janastudio.services where name = 'Manicura Builder Gel' limit 1;
  select id into s_dip from janastudio.services where name = 'Sistema Dip Powder (Kapping)' limit 1;
  select id into s_polygel from janastudio.services where name = 'Sistema Polygel' limit 1;
  select id into s_jelly from janastudio.services where name = 'Manicura Jelly Express' limit 1;
  select id into s_acrilico from janastudio.services where name = 'Sistema Acrílico' limit 1;
  select id into s_esculpidas from janastudio.services where name = 'Uñas Esculpidas' limit 1;
  select id into s_remocion from janastudio.services where name = 'Remoción de acrílicos/sistemas' limit 1;
  select id into s_diseno from janastudio.services where name = 'Diseños elaborados (pinceladas)' limit 1;
  select id into s_una_unidad from janastudio.services where name = 'Uña por unidad (reparación)' limit 1;
  select id into s_jelly_spa from janastudio.services where name = 'Jelly Spa Adicional' limit 1;
  select id into s_pedi_trad from janastudio.services where name = 'Pedicura Tradicional' limit 1;
  select id into s_pedi_semi from janastudio.services where name = 'Pedicura Semipermanente' limit 1;

  select id into i_masglow from janastudio.inventory where name = 'Esmalte Tradicional (Masglow)' limit 1;
  select id into i_semi from janastudio.inventory where name = 'Esmalte Semipermanente' limit 1;
  select id into i_serum_u from janastudio.inventory where name = 'Serum de Uñas' limit 1;
  select id into i_serum_m from janastudio.inventory where name = 'Serum Brillante de Manos' limit 1;
  select id into i_rubber from janastudio.inventory where name = 'Base Rubber' limit 1;
  select id into i_builder from janastudio.inventory where name = 'Builder Gel' limit 1;
  select id into i_acrilico from janastudio.inventory where name = 'Polvo Acrílico' limit 1;
  select id into i_monomero from janastudio.inventory where name = 'Monómero' limit 1;
  select id into i_polygel from janastudio.inventory where name = 'Polygel' limit 1;
  select id into i_jelly_tips from janastudio.inventory where name = 'Uñas Jelly (Tips)' limit 1;
  select id into i_removedor from janastudio.inventory where name = 'Removedor de Sistemas' limit 1;
  select id into i_jelly_spa from janastudio.inventory where name = 'Jelly Spa (Polvo)' limit 1;
  select id into i_exfoliante from janastudio.inventory where name = 'Exfoliante de Pies' limit 1;
  select id into i_crema from janastudio.inventory where name = 'Crema de Pies' limit 1;
  select id into i_jabon from janastudio.inventory where name = 'Jabón de Pies' limit 1;

  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_tradicional, i_masglow, 'Esmalte Tradicional (Masglow)', 1, 0.20, 'ml'),
  (s_tradicional, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_tradicional, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml'),
  (s_semi, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_semi, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_semi, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml'),
  (s_nivelacion, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_nivelacion, i_rubber, 'Base Rubber', 1, 0.40, 'ml'),
  (s_nivelacion, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_nivelacion, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml'),
  (s_builder, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_builder, i_builder, 'Builder Gel', 2, 0.50, 'gr'),
  (s_builder, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_builder, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml'),
  (s_dip, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_dip, i_acrilico, 'Polvo Acrílico', 2, 0.30, 'gr'),
  (s_dip, i_monomero, 'Monómero', 2, 0.40, 'ml'),
  (s_dip, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_dip, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml'),
  (s_polygel, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_polygel, i_polygel, 'Polygel', 2, 0.45, 'gr'),
  (s_polygel, i_monomero, 'Monómero', 1, 0.40, 'ml'),
  (s_polygel, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_polygel, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml'),
  (s_jelly, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_jelly, i_jelly_tips, 'Uñas Jelly (Tips)', 10, 0.10, 'unidad'),
  (s_jelly, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_jelly, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml'),
  (s_acrilico, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_acrilico, i_acrilico, 'Polvo Acrílico', 4, 0.30, 'gr'),
  (s_acrilico, i_monomero, 'Monómero', 4, 0.40, 'ml'),
  (s_acrilico, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_acrilico, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml'),
  (s_esculpidas, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_esculpidas, i_polygel, 'Polygel', 4, 0.45, 'gr'),
  (s_esculpidas, i_monomero, 'Monómero', 3, 0.40, 'ml'),
  (s_esculpidas, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_esculpidas, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml'),
  (s_remocion, i_removedor, 'Removedor de Sistemas', 2, 0.25, 'ml'),
  (s_diseno, i_semi, 'Esmalte Semipermanente', 0.5, 0.35, 'ml'),
  (s_una_unidad, i_jelly_tips, 'Uñas Jelly (Tips)', 1, 0.10, 'unidad'),
  (s_jelly_spa, i_jelly_spa, 'Jelly Spa (Polvo)', 1, 0.80, 'sobres'),
  (s_pedi_trad, i_masglow, 'Esmalte Tradicional (Masglow)', 1, 0.20, 'ml'),
  (s_pedi_trad, i_exfoliante, 'Exfoliante de Pies', 1, 0.20, 'ml'),
  (s_pedi_trad, i_crema, 'Crema de Pies', 1, 0.15, 'ml'),
  (s_pedi_trad, i_jabon, 'Jabón de Pies', 1, 0.10, 'ml'),
  (s_pedi_semi, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_pedi_semi, i_exfoliante, 'Exfoliante de Pies', 1, 0.20, 'ml'),
  (s_pedi_semi, i_crema, 'Crema de Pies', 1, 0.15, 'ml'),
  (s_pedi_semi, i_jabon, 'Jabón de Pies', 1, 0.10, 'ml');

end $$;
