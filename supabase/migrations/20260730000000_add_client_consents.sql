-- Add digital consent storage to clients table
-- Consents are stored as a JSONB array of consent records

ALTER TABLE janastudio.clients
  ADD COLUMN IF NOT EXISTS consents JSONB DEFAULT '[]'::jsonb;

-- Each consent record structure:
-- {
--   "id": "uuid",
--   "service_type": "laser",
--   "consent_text": "...",
--   "signature_base64": "data:image/png;base64,...",
--   "signed_by": "client name",
--   "staff_id": "uuid",
--   "staff_name": "...",
--   "created_at": "iso timestamp",
--   "metadata": {}
-- }

CREATE INDEX IF NOT EXISTS clients_consents_gin_idx
  ON janastudio.clients USING gin (consents jsonb_path_ops);
