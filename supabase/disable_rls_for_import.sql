-- Drop the enforce_client_creator trigger (will recreate after import)
DROP TRIGGER IF EXISTS enforce_client_creator_trigger ON public.clients;

-- Disable RLS only (not triggers - FK triggers can't be disabled)
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_extras DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- Also drop the sync_appointment_exchange_rate trigger temporarily
DROP TRIGGER IF EXISTS sync_appointment_exchange_rate_trigger ON public.transactions;
