-- =====================================================
-- JanaStudio CRM - Datos de Demo
-- Esquema: janastudio
-- Ejecutar DESPUÉS del schema completo
-- =====================================================

-- Servicios de ejemplo (Uñas, Pestañas, Alisado)
INSERT INTO janastudio.services (name, price, duration_minutes, category, commission_pct, description) VALUES
  -- Uñas
  ('Manicuría Francesa', 15, 60, 'Uñas', 40, 'Manicuría clásica con esmalte francés'),
  ('Manicuría Gel', 20, 75, 'Uñas', 40, 'Manicuría con esmalte de gel duradero'),
  ('Pedicuría', 18, 60, 'Uñas', 40, 'Pedicuría completa con esmalte'),
  ('Uñas Acrílicas', 35, 120, 'Uñas', 40, 'Extensión de uñas con acrílico'),
  ('Decoración de Uñas', 25, 90, 'Uñas', 40, 'Diseño artístico en uñas'),
  
  -- Pestañas
  ('Pestañas Rusa', 25, 120, 'Pestañas', 40, 'Extensiones de pestañas rusa 1:1'),
  ('Pestañas Volumen', 30, 120, 'Pestañas', 40, 'Extensiones con volumen'),
  ('Pestañas Híbrida', 28, 110, 'Pestañas', 40, 'Técnica híbrida rusa-volumen'),
  ('Lifting de Pestañas', 20, 60, 'Pestañas', 40, 'Rizado y lift de pestañas naturales'),
  ('Retiro de Pestañas', 10, 30, 'Pestañas', 40, 'Retiro profesional de extensiones'),
  
  -- Alisado
  ('Alisado Japonés', 80, 180, 'Cabello', 40, 'Alisado permanente japonés'),
  ('Alisado Orgánico', 70, 150, 'Cabello', 40, 'Alisado con productos orgánicos'),
  ('Alisado con Keratina', 90, 200, 'Cabello', 40, 'Tratamiento de alisado con keratina'),
  ('Touch-up Alisado', 50, 120, 'Cabello', 40, 'Retoque de alisado')
ON CONFLICT DO NOTHING;

-- Clientes de ejemplo
INSERT INTO janastudio.clients (name, phone, skin_type, nail_type, notes) VALUES
  ('María González', '0414-1234567', 'Normal', 'Normal', 'Cliente frecuente de pestañas'),
  ('Laura Martínez', '0412-7654321', 'Sensible', 'Frágil', 'Prefiere productos hipoalergénicos'),
  ('Carolina López', '0416-9876543', 'Normal', 'Normal', 'Fan del gel francés'),
  ('Andrea Rodríguez', '0424-5551234', 'Grasa', 'Normal', 'Alisado cada 3 meses'),
  ('Valentina Pérez', '0414-8889999', 'Normal', 'Fuerte', 'Decoración artística')
ON CONFLICT DO NOTHING;

-- Inventario de ejemplo
INSERT INTO janastudio.inventory (name, category, stock, cost, price, unit, is_for_sale, min_stock) VALUES
  -- Productos de uñas
  ('Esmalte Gel Rojo', 'Uñas', 50, 8.50, 0, 'unidad', false, 10),
  ('Esmalte Gel Nude', 'Uñas', 45, 8.50, 0, 'unidad', false, 10),
  ('Esmalte Francés', 'Uñas', 40, 9.00, 0, 'unidad', false, 10),
  ('Acrílico Transparente', 'Uñas', 30, 15.00, 0, 'kg', false, 5),
  ('Liquid Monomer', 'Uñas', 25, 12.00, 0, 'ml', false, 5),
  
  -- Productos de pestañas
  ('Pegamento Rusa', 'Pestañas', 35, 25.00, 0, 'unidad', false, 10),
  ('Pestañas Rusa 0.10', 'Pestañas', 20, 18.00, 0, 'paquete', false, 5),
  ('Pestañas Volumen 0.07', 'Pestañas', 15, 22.00, 0, 'paquete', false, 5),
  ('Primer para Pestañas', 'Pestañas', 30, 10.00, 0, 'unidad', false, 10),
  ('Remover de Pestañas', 'Pestañas', 40, 8.00, 0, 'unidad', false, 10),
  
  -- Productos de alisado
  ('Keratina Brasilera', 'Cabello', 10, 45.00, 0, 'litro', false, 3),
  ('Alisado Japonés Kit', 'Cabello', 8, 65.00, 0, 'kit', false, 2),
  ('Shampoo Pre-Tratamiento', 'Cabello', 25, 8.00, 12.00, 'litro', true, 5),
  ('Acondicionador Post-Tratamiento', 'Cabello', 25, 9.00, 14.00, 'litro', true, 5),
  ('Mascarilla Capilar', 'Cabello', 20, 12.00, 18.00, 'unidad', true, 5)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FIN DE DATOS DE DEMO
-- =====================================================
