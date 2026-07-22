-- JanaStudio: checkout transaccional e idempotente.
-- No aplicar sin revisar primero el dry-run y la reconciliación documentada.

begin;

create unique index if not exists package_sessions_one_per_appointment_uidx
  on janastudio.package_sessions(client_package_id, appointment_id)
  where appointment_id is not null;

create or replace function janastudio.process_checkout_atomic(
  p_payment jsonb,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = janastudio, pg_temp
as $$
declare
  v_transaction_id uuid;
  v_primary_appointment uuid;
  v_appointment_id uuid;
  v_client_id uuid;
  v_current_staff_id uuid;
  v_total_usd numeric;
  v_exchange_rate numeric;
  v_transaction_amount numeric;
  v_payment_method text;
  v_staff jsonb;
  v_product jsonb;
  v_package jsonb;
  v_consumption jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_payment_plan_id uuid;
  v_inserted_rows integer;
  v_recipe record;
begin
  if p_idempotency_key is null then
    raise exception 'Missing idempotency key';
  end if;
  if not janastudio.is_active_staff() then
    raise exception 'Unauthorized';
  end if;

  v_current_staff_id := janastudio.current_staff_id();
  v_total_usd := coalesce((p_payment->>'totalUsd')::numeric, 0);
  v_exchange_rate := coalesce((p_payment->>'fixedRate')::numeric, 0);
  v_client_id := nullif(p_payment->>'clientId', '')::uuid;
  v_primary_appointment := nullif(coalesce(
    p_payment->>'appointmentId',
    p_payment->'appointmentIds'->>0
  ), '')::uuid;

  if v_total_usd < 0 then raise exception 'Invalid checkout total'; end if;
  if coalesce((p_payment->>'transferBs')::numeric, 0) > 0 and v_exchange_rate <= 0 then
    raise exception 'Invalid exchange rate';
  end if;

  v_transaction_amount := case
    when coalesce((p_payment->>'isFinanced')::boolean, false)
      then coalesce((p_payment->>'initialPaymentAmount')::numeric, 0)
    else v_total_usd
  end;
  v_payment_method := case
    when coalesce((p_payment->>'isFinanced')::boolean, false)
      then 'Financiado (' || coalesce(p_payment->>'initialPaymentMethod', 'Sin especificar') || ')'
    when coalesce((p_payment->>'isMixed')::boolean, false) then 'Mixto'
    when coalesce((p_payment->>'cashUsd')::numeric, 0) > 0 then coalesce(p_payment->>'methodUsd', 'USD')
    else coalesce(p_payment->>'methodBs', 'Bs.')
  end;

  -- La transacción reclama primero la clave. Un reintento concurrente espera aquí
  -- y no puede volver a descontar inventario ni consumir sesiones.
  insert into janastudio.transactions(
    description, amount, type, category, payment_method, exchange_rate,
    currency, metadata, created_at, created_by_staff_id, idempotency_key, client_id
  ) values (
    case when v_primary_appointment is null
      then 'VENTA DIRECTA - Cliente: ' || coalesce(p_payment->>'clientName', 'Cliente')
      else 'PAGO - ' || coalesce(p_payment->>'serviceName', 'Servicio') ||
        ' - Cliente: ' || coalesce(p_payment->>'clientName', 'Cliente')
    end,
    v_transaction_amount,
    'income',
    'Ventas JanaStudio',
    v_payment_method,
    v_exchange_rate,
    'USD',
    p_payment || jsonb_build_object(
      'appointment_id', v_primary_appointment,
      'mixed_payment', coalesce((p_payment->>'isMixed')::boolean, false),
      'cash_usd', coalesce((p_payment->>'cashUsd')::numeric, 0),
      'transfer_bs', coalesce((p_payment->>'transferBs')::numeric, 0),
      'tips_total', coalesce((p_payment->>'totalTips')::numeric, 0)
    ),
    now(),
    v_current_staff_id,
    p_idempotency_key,
    v_client_id
  )
  on conflict (idempotency_key) where idempotency_key is not null do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    select id into v_transaction_id
    from janastudio.transactions
    where idempotency_key = p_idempotency_key;

    return jsonb_build_object('transaction_id', v_transaction_id, 'replayed', true);
  end if;

  for v_appointment_id in
    select value::uuid
    from jsonb_array_elements_text(coalesce(p_payment->'appointmentIds', '[]'::jsonb))
  loop
    if not janastudio.can_access_appointment(v_appointment_id) then
      raise exception 'Appointment access denied: %', v_appointment_id;
    end if;

    update janastudio.appointments
    set status = 'Completado', completed_at = coalesce(completed_at, now()),
        exchange_rate = case when v_exchange_rate > 0 then v_exchange_rate else exchange_rate end
    where id = v_appointment_id;

    update janastudio.appointment_services
    set status = 'Completado', completed_at = coalesce(completed_at, now()), updated_at = now()
    where appointment_id = v_appointment_id;
  end loop;

  if jsonb_array_length(coalesce(p_payment->'appointmentIds', '[]'::jsonb)) = 0
     and v_primary_appointment is not null then
    if not janastudio.can_access_appointment(v_primary_appointment) then
      raise exception 'Appointment access denied: %', v_primary_appointment;
    end if;
    update janastudio.appointments
    set status = 'Completado', completed_at = coalesce(completed_at, now()),
        exchange_rate = case when v_exchange_rate > 0 then v_exchange_rate else exchange_rate end
    where id = v_primary_appointment;
    update janastudio.appointment_services
    set status = 'Completado', completed_at = coalesce(completed_at, now()), updated_at = now()
    where appointment_id = v_primary_appointment;
  end if;

  -- Conserva las comisiones calculadas por el POS en la cita principal.
  if v_primary_appointment is not null then
    delete from janastudio.appointment_staff where appointment_id = v_primary_appointment;
    for v_staff in
      select value from jsonb_array_elements(coalesce(p_payment->'staffInvolved', '[]'::jsonb))
    loop
      if nullif(v_staff->>'staffId', '') is not null then
        insert into janastudio.appointment_staff(
          appointment_id, staff_id, commission_earned, tip_amount
        ) values (
          v_primary_appointment,
          (v_staff->>'staffId')::uuid,
          coalesce((v_staff->>'commissionEarned')::numeric, 0) +
            coalesce((v_staff->>'productCommissionEarned')::numeric, 0),
          coalesce((v_staff->>'tip')::numeric, 0)
        );
      end if;
    end loop;
  end if;

  -- Productos vendidos: bloqueo y descuento condicional evitan stock negativo.
  for v_product in
    select value from jsonb_array_elements(coalesce(p_payment->'products', '[]'::jsonb))
  loop
    v_product_id := nullif(v_product->>'id', '')::uuid;
    v_quantity := greatest(coalesce((v_product->>'quantity')::numeric, 1), 0);
    if v_product_id is null or v_quantity <= 0 then continue; end if;

    update janastudio.inventory
    set stock = stock - v_quantity, updated_at = now()
    where id = v_product_id and stock >= v_quantity;
    if not found then
      raise exception 'Insufficient inventory for product %', v_product_id;
    end if;

    insert into janastudio.inventory_movements(product_id, type, amount, reason, staff_id)
    values (
      v_product_id, 'exit', v_quantity,
      'Venta POS - Cliente: ' || coalesce(p_payment->>'clientName', 'Cliente'),
      v_current_staff_id
    );
  end loop;

  -- Recetas de los servicios realizados. appointment_services prevalece cuando
  -- ya contiene el mismo servicio principal para evitar un descuento duplicado.
  for v_recipe in
    with checkout_appointments as (
      select value::uuid as appointment_id
      from jsonb_array_elements_text(coalesce(p_payment->'appointmentIds', '[]'::jsonb))
      union
      select v_primary_appointment where v_primary_appointment is not null
    ), checkout_services as (
      select a.id as appointment_id, a.service_id
      from janastudio.appointments a
      join checkout_appointments ca on ca.appointment_id = a.id
      where a.service_id is not null
        and not exists (
          select 1 from janastudio.appointment_services aps
          where aps.appointment_id = a.id and aps.service_id = a.service_id
        )
      union all
      select aps.appointment_id, aps.service_id
      from janastudio.appointment_services aps
      join checkout_appointments ca on ca.appointment_id = aps.appointment_id
    )
    select sc.inventory_item_id, sum(sc.quantity_per_service) as quantity
    from checkout_services cs
    join janastudio.service_costs sc on sc.service_id = cs.service_id
    where sc.inventory_item_id is not null and sc.quantity_per_service > 0
    group by sc.inventory_item_id
  loop
    update janastudio.inventory
    set stock = stock - v_recipe.quantity, updated_at = now()
    where id = v_recipe.inventory_item_id and stock >= v_recipe.quantity;
    if not found then
      raise exception 'Insufficient recipe inventory for product %', v_recipe.inventory_item_id;
    end if;

    insert into janastudio.inventory_movements(product_id, type, amount, reason, staff_id)
    values (
      v_recipe.inventory_item_id, 'exit', v_recipe.quantity,
      'Consumo automático de receta - Checkout ' || v_transaction_id::text,
      v_current_staff_id
    );
  end loop;

  for v_package in
    select value from jsonb_array_elements(coalesce(p_payment->'soldPackages', '[]'::jsonb))
  loop
    insert into janastudio.client_packages(
      client_id, service_id, total_sessions, used_sessions, status,
      total_amount, expires_at
    ) values (
      v_client_id,
      nullif(v_package->>'serviceId', '')::uuid,
      greatest(coalesce((v_package->>'totalSessions')::integer, 8), 1),
      0,
      'active',
      coalesce((v_package->>'totalAmount')::numeric, 0),
      now() + interval '10 months'
    );
  end loop;

  if coalesce((p_payment->>'isFinanced')::boolean, false) and v_client_id is not null then
    insert into janastudio.payment_plans(
      client_id, appointment_id, total_amount, total_installments,
      paid_installments, remaining_balance, status
    ) values (
      v_client_id,
      v_primary_appointment,
      v_total_usd,
      greatest(coalesce((p_payment->>'totalInstallments')::integer, 3), 1),
      1,
      greatest(coalesce((p_payment->>'remainingBalance')::numeric, 0), 0),
      case when coalesce((p_payment->>'remainingBalance')::numeric, 0) <= 0 then 'paid' else 'pending' end
    ) returning id into v_payment_plan_id;

    insert into janastudio.installment_payments(
      payment_plan_id, amount_paid, payment_method
    ) values (
      v_payment_plan_id,
      coalesce((p_payment->>'initialPaymentAmount')::numeric, 0),
      coalesce(p_payment->>'initialPaymentMethod', 'Sin especificar')
    );
  end if;

  for v_consumption in
    select value from jsonb_array_elements(coalesce(p_payment->'packageConsumptions', '[]'::jsonb))
  loop
    insert into janastudio.package_sessions(
      client_package_id, appointment_id, notes, supplies_cost
    ) values (
      nullif(v_consumption->>'clientPackageId', '')::uuid,
      nullif(v_consumption->>'appointmentId', '')::uuid,
      'Consumo en checkout POS',
      coalesce((v_consumption->>'suppliesCost')::numeric, 0)
    )
    on conflict (client_package_id, appointment_id) where appointment_id is not null do nothing;

    get diagnostics v_inserted_rows = row_count;
    if v_inserted_rows > 0 then
      update janastudio.client_packages
      set used_sessions = least(used_sessions + 1, total_sessions),
          status = case when used_sessions + 1 >= total_sessions then 'completed' else 'active' end
      where id = nullif(v_consumption->>'clientPackageId', '')::uuid
        and used_sessions < total_sessions;
      if not found then
        raise exception 'Package has no available sessions';
      end if;
    end if;
  end loop;

  return jsonb_build_object('transaction_id', v_transaction_id, 'replayed', false);
end;
$$;

revoke all on function janastudio.process_checkout_atomic(jsonb, uuid) from public, anon;
grant execute on function janastudio.process_checkout_atomic(jsonb, uuid) to authenticated;

commit;
