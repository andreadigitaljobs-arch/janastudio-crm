-- Ensure every client created by staff is attributed from the authenticated session.
begin;

create or replace function public.enforce_client_creator()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_staff_id uuid;
begin
  v_staff_id := public.current_staff_id();
  if v_staff_id is null then
    raise exception 'Authenticated user is not linked to active staff'
      using errcode = '42501';
  end if;

  -- Never trust a creator id supplied by the browser.
  new.created_by_staff_id := v_staff_id;
  return new;
end
$$;

drop trigger if exists enforce_client_creator_trigger on public.clients;
create trigger enforce_client_creator_trigger
before insert on public.clients
for each row execute function public.enforce_client_creator();

drop policy if exists clients_insert_matrix on public.clients;
create policy clients_insert_matrix on public.clients for insert to authenticated
with check (
  public.is_active_staff()
  and created_by_staff_id = public.current_staff_id()
);

grant execute on function public.enforce_client_creator() to authenticated;

commit;
