-- 1. Create exec_sql helper function for programmatic SQL execution
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add missing columns to transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS date DATE DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS time TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS reference TEXT;

-- 3. Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions' AND table_schema = 'public'
ORDER BY ordinal_position;
