-- Catálogo inicial de prueba para poder ensayar el flujo Láser.
-- Los precios son editables desde Servicios antes de la entrega final.
begin;

alter table janastudio.services
  add column if not exists laser_price_single numeric,
  add column if not exists laser_price_4 numeric,
  add column if not exists laser_price_8 numeric;

insert into janastudio.services (
  name, description, category, price, laser_price_single, laser_price_4,
  laser_price_8, duration_minutes, commission_pct, active
)
select seed.name, 'Tarifa inicial de prueba; editar antes de la entrega final.',
  'Depilación Láser', seed.single_price, seed.single_price, seed.price_4,
  seed.price_8, seed.duration, 30, true
from (values
  ('Axilas',              15::numeric,  52::numeric,  96::numeric, 30),
  ('Bozo',                10::numeric,  36::numeric,  64::numeric, 20),
  ('Bikini',              22::numeric,  80::numeric, 144::numeric, 35),
  ('Brasilera',           30::numeric, 108::numeric, 192::numeric, 40),
  ('Media pierna',        28::numeric, 100::numeric, 180::numeric, 40),
  ('Piernas completas',   45::numeric, 160::numeric, 288::numeric, 60),
  ('Rostro completo',     25::numeric,  90::numeric, 160::numeric, 40),
  ('Cuerpo completo',     80::numeric, 290::numeric, 520::numeric, 90)
) as seed(name, single_price, price_4, price_8, duration)
where not exists (
  select 1 from janastudio.services existing
  where lower(existing.name) = lower(seed.name)
    and lower(coalesce(existing.category, '')) in ('depilación láser', 'depilacion laser', 'laser', 'láser')
);

commit;
