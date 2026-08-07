-- Migration to grant worker role full read access to clients table
-- This allows manicurists, lashistas, estilistas, etc. to view all clients in the CRM.

CREATE OR REPLACE FUNCTION janastudio.can_access_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = janastudio
AS $$
  SELECT case
    when not janastudio.is_active_staff() then false
    when janastudio.current_staff_kind() in ('admin','reception','cashier','worker') then true
    else false
  end
$$;
