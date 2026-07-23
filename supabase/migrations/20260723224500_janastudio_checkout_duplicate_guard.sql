begin;

create or replace function janastudio.guard_duplicate_checkout_transactions()
returns trigger
language plpgsql
security definer
set search_path = janastudio, pg_temp
as $$
declare
  v_appointment_ids text[];
  v_appointment_id text;
  v_existing_transaction uuid;
begin
  if new.category is distinct from 'Ventas JanaStudio' then
    return new;
  end if;

  select array_agg(distinct appointment_id order by appointment_id)
  into v_appointment_ids
  from (
    select value as appointment_id
    from jsonb_array_elements_text(coalesce(new.metadata->'appointmentIds', '[]'::jsonb))
    union
    select nullif(coalesce(
      new.metadata->>'appointmentId',
      new.metadata->>'appointment_id'
    ), '')
  ) incoming
  where appointment_id is not null;

  if coalesce(array_length(v_appointment_ids, 1), 0) = 0 then
    return new;
  end if;

  -- Lock every appointment in a stable order so two cashiers cannot charge
  -- overlapping groups concurrently with different idempotency keys.
  foreach v_appointment_id in array v_appointment_ids
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_appointment_id, 0));
  end loop;

  select transaction_row.id
  into v_existing_transaction
  from janastudio.transactions transaction_row
  where transaction_row.category = 'Ventas JanaStudio'
    and transaction_row.idempotency_key is distinct from new.idempotency_key
    and exists (
      select 1
      from unnest(v_appointment_ids) incoming_id
      join lateral jsonb_array_elements_text(
        coalesce(
          transaction_row.metadata->'appointmentIds',
          jsonb_build_array(coalesce(
            transaction_row.metadata->>'appointmentId',
            transaction_row.metadata->>'appointment_id'
          ))
        )
      ) existing_id(value) on existing_id.value = incoming_id
    )
  order by transaction_row.created_at desc
  limit 1;

  if v_existing_transaction is not null then
    raise exception 'Checkout already processed for one or more appointments'
      using
        errcode = '23505',
        detail = 'existing_transaction_id=' || v_existing_transaction::text,
        hint = 'Refresh the checkout queue before attempting another payment.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_duplicate_checkout_transactions_trigger
  on janastudio.transactions;

create trigger guard_duplicate_checkout_transactions_trigger
before insert on janastudio.transactions
for each row
execute function janastudio.guard_duplicate_checkout_transactions();

revoke all on function janastudio.guard_duplicate_checkout_transactions() from public, anon;

commit;
