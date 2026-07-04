-- Fixes the "409 Conflict" during checkout (caused by the trigger missing a unique index)
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_reminders_unique_pending_idx 
ON public.scheduled_reminders (client_id, kind) 
WHERE sent = false;
