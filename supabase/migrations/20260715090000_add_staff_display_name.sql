-- Short display name (e.g. "Francimar Estevez") shown across the app instead of the full legal name.
ALTER TABLE janastudio.staff ADD COLUMN IF NOT EXISTS display_name TEXT;
