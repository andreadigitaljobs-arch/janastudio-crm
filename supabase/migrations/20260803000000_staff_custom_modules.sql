-- Add custom_modules JSONB column to staff table
-- Allows granting specific module access to individual staff members
-- Example: {"modules": ["diagnosis", "laser"]}
ALTER TABLE janastudio.staff ADD COLUMN IF NOT EXISTS custom_modules jsonb DEFAULT NULL;

COMMENT ON COLUMN janastudio.staff.custom_modules IS 'Per-staff module access overrides. Shape: {"modules": ["diagnosis","laser"]}';

-- Grant diagnosis access to Narilin and Lis Lady (Estilistas)
UPDATE janastudio.staff
SET custom_modules = '{"modules": ["diagnosis"]}'::jsonb
WHERE name IN ('Nairim Carolina Gómez de Sousa', 'Lisdely Esther Mota Carpio');

-- Grant laser + clients access to María Antonella (Láser esthetician)
UPDATE janastudio.staff
SET custom_modules = '{"modules": ["laser", "clients"]}'::jsonb
WHERE name = 'María Antonella Mariani Raymond';
