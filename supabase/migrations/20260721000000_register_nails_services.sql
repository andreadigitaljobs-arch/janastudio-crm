-- =========================================================================
-- Migration: Register Nails (Manicura/Pedicura) Services and Insumos
-- Description: Inserts nails services, inventory items (insumos), and maps
--              them in the service_costs table for profitability reporting.
-- =========================================================================

-- 1. Insert services into janastudio.services
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

-- 2. Insert materials into janastudio.inventory (category 'Insumos Uñas')
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

-- 3. Link Services with their respective insumos in janastudio.service_costs
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
  -- Retrieve service UUIDs
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

  -- Retrieve inventory item UUIDs
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

  -- Clear previous mapping
  delete from janastudio.service_costs where service_id in (
    s_tradicional, s_semi, s_nivelacion, s_builder, s_dip, s_polygel,
    s_jelly, s_acrilico, s_esculpidas, s_remocion, s_diseno, s_una_unidad,
    s_jelly_spa, s_pedi_trad, s_pedi_semi
  );

  -- 1. Manicura Tradicional
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_tradicional, i_masglow, 'Esmalte Tradicional (Masglow)', 1, 0.20, 'ml'),
  (s_tradicional, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_tradicional, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml');

  -- 2. Manicura Semipermanente
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_semi, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_semi, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_semi, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml');

  -- 3. Semipermanente + Nivelación
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_nivelacion, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_nivelacion, i_rubber, 'Base Rubber', 1, 0.40, 'ml'),
  (s_nivelacion, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_nivelacion, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml');

  -- 4. Builder Gel
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_builder, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_builder, i_builder, 'Builder Gel', 2, 0.50, 'gr'),
  (s_builder, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_builder, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml');

  -- 5. Dip Powder (Kapping)
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_dip, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_dip, i_acrilico, 'Polvo Acrílico', 2, 0.30, 'gr'),
  (s_dip, i_monomero, 'Monómero', 2, 0.40, 'ml'),
  (s_dip, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_dip, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml');

  -- 6. Sistema Polygel
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_polygel, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_polygel, i_polygel, 'Polygel', 2, 0.45, 'gr'),
  (s_polygel, i_monomero, 'Monómero', 1, 0.40, 'ml'),
  (s_polygel, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_polygel, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml');

  -- 7. Jelly Express
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_jelly, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_jelly, i_jelly_tips, 'Uñas Jelly (Tips)', 10, 0.10, 'unidad'),
  (s_jelly, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_jelly, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml');

  -- 8. Sistema Acrílico
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_acrilico, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_acrilico, i_acrilico, 'Polvo Acrílico', 4, 0.30, 'gr'),
  (s_acrilico, i_monomero, 'Monómero', 4, 0.40, 'ml'),
  (s_acrilico, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_acrilico, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml');

  -- 9. Uñas Esculpidas
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_esculpidas, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_esculpidas, i_polygel, 'Polygel', 4, 0.45, 'gr'),
  (s_esculpidas, i_monomero, 'Monómero', 3, 0.40, 'ml'),
  (s_esculpidas, i_serum_u, 'Serum de Uñas', 1, 0.15, 'ml'),
  (s_esculpidas, i_serum_m, 'Serum Brillante de Manos', 1, 0.25, 'ml');

  -- Adicionales
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_remocion, i_removedor, 'Removedor de Sistemas', 2, 0.25, 'ml'),
  (s_diseno, i_semi, 'Esmalte Semipermanente', 0.5, 0.35, 'ml'),
  (s_una_unidad, i_jelly_tips, 'Uñas Jelly (Tips)', 1, 0.10, 'unidad'),
  (s_jelly_spa, i_jelly_spa, 'Jelly Spa (Polvo)', 1, 0.80, 'sobres');

  -- Pedicura Tradicional
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_pedi_trad, i_masglow, 'Esmalte Tradicional (Masglow)', 1, 0.20, 'ml'),
  (s_pedi_trad, i_exfoliante, 'Exfoliante de Pies', 1, 0.20, 'ml'),
  (s_pedi_trad, i_crema, 'Crema de Pies', 1, 0.15, 'ml'),
  (s_pedi_trad, i_jabon, 'Jabón de Pies', 1, 0.10, 'ml');

  -- Pedicura Semipermanente
  insert into janastudio.service_costs (service_id, inventory_item_id, item_name, quantity_per_service, unit_cost, unit) values
  (s_pedi_semi, i_semi, 'Esmalte Semipermanente', 1, 0.35, 'ml'),
  (s_pedi_semi, i_exfoliante, 'Exfoliante de Pies', 1, 0.20, 'ml'),
  (s_pedi_semi, i_crema, 'Crema de Pies', 1, 0.15, 'ml'),
  (s_pedi_semi, i_jabon, 'Jabón de Pies', 1, 0.10, 'ml');

end $$;
