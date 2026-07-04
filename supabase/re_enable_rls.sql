-- Re-enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Recreate triggers (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS enforce_client_creator_trigger ON public.clients;
CREATE TRIGGER enforce_client_creator_trigger
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_client_creator();

DROP TRIGGER IF EXISTS sync_appointment_exchange_rate_trigger ON public.transactions;
CREATE TRIGGER sync_appointment_exchange_rate_trigger
  AFTER INSERT OR UPDATE OF exchange_rate, metadata ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_appointment_exchange_rate();
