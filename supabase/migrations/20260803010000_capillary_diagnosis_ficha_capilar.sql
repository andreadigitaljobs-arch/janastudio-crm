-- Add JSONB data column to store the full Ficha Capilar form data
-- This allows the new form structure (salud checkboxes, cuero cabelludo, tratamientos, etc.)
-- while keeping old columns for backward compatibility
ALTER TABLE janastudio.capillary_diagnoses ADD COLUMN IF NOT EXISTS data jsonb DEFAULT NULL;

COMMENT ON COLUMN janastudio.capillary_diagnoses.data IS 'Full Ficha Capilar form data. Contains: wash_frequency, salud, cuero_cabelludo, tinturado, alisado, hidratacion, notas';
