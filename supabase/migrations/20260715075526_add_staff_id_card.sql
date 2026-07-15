-- Adds a national ID / cédula field to staff, matching the existing clients.id_card column.
ALTER TABLE janastudio.staff ADD COLUMN IF NOT EXISTS id_card TEXT;
