-- Fix client creation for non-admin staff.
-- Supabase/Postgres RLS can reject an INSERT before a BEFORE INSERT trigger
-- has normalized created_by_staff_id. The trigger still owns attribution;
-- the INSERT policy only needs to confirm the user is active staff.

begin;

drop policy if exists clients_insert_matrix on public.clients;

create policy clients_insert_matrix on public.clients for insert to authenticated
with check (public.is_active_staff());

commit;
