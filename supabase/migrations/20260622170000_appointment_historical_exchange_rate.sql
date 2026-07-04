-- Freeze the checkout exchange rate on each appointment so historical views do
-- not change when today's BCV/USDT rate changes.
alter table public.appointments
  add column if not exists exchange_rate numeric;

update public.appointments a
set exchange_rate = (
  select t.exchange_rate
  from public.transactions t
  where t.type = 'income'
    and t.exchange_rate > 0
    and (
      t.metadata->>'appointment_id' = a.id::text
      or exists (
        select 1
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(t.metadata->'appointmentIds') = 'array'
              then t.metadata->'appointmentIds'
            else '[]'::jsonb
          end
        ) appointment_id
        where appointment_id = a.id::text
      )
    )
  order by t.created_at desc
  limit 1
)
where a.exchange_rate is null
  and exists (
    select 1
    from public.transactions t
    where t.type = 'income'
      and t.exchange_rate > 0
      and (
        t.metadata->>'appointment_id' = a.id::text
        or exists (
          select 1
          from jsonb_array_elements_text(
            case
              when jsonb_typeof(t.metadata->'appointmentIds') = 'array'
                then t.metadata->'appointmentIds'
              else '[]'::jsonb
            end
          ) appointment_id
          where appointment_id = a.id::text
        )
      )
  );

create or replace function public.sync_appointment_exchange_rate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appointment_id text;
begin
  if new.type <> 'income' or coalesce(new.exchange_rate, 0) <= 0 then
    return new;
  end if;

  v_appointment_id := new.metadata->>'appointment_id';
  if v_appointment_id is not null and v_appointment_id <> '' then
    update public.appointments
    set exchange_rate = new.exchange_rate
    where id = v_appointment_id::uuid;
  end if;

  for v_appointment_id in
    select value
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(new.metadata->'appointmentIds') = 'array'
          then new.metadata->'appointmentIds'
        else '[]'::jsonb
      end
    )
  loop
    update public.appointments
    set exchange_rate = new.exchange_rate
    where id = v_appointment_id::uuid;
  end loop;

  return new;
end
$$;

drop trigger if exists sync_appointment_exchange_rate_trigger
  on public.transactions;
create trigger sync_appointment_exchange_rate_trigger
after insert or update of exchange_rate, metadata on public.transactions
for each row execute function public.sync_appointment_exchange_rate();
