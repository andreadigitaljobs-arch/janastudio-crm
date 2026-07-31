-- Permite que recepción divida un paquete láser en cuotas libres (50/50,
-- 80/20, 30/40/30, etc.) sin confundir el plan con la moneda del abono.
create or replace function janastudio.sell_laser_package_custom(
  p_client_id uuid,
  p_service_id uuid,
  p_sessions integer,
  p_total numeric,
  p_payment_mode text,
  p_payment_method text,
  p_exchange_rate numeric,
  p_installments jsonb
) returns uuid
language plpgsql
security definer
set search_path=janastudio,pg_temp
as $$
declare
  v_pkg uuid;
  v_tx uuid;
  v_staff uuid;
  v_exp timestamptz := now() + interval '10 months';
  v_interval integer := 21;
  v_item jsonb;
  v_number integer := 0;
  v_sum numeric := 0;
  v_amount numeric;
  v_first numeric := 0;
  v_due timestamptz;
  v_allocation text;
begin
  if not janastudio.is_active_staff() then raise exception 'Unauthorized'; end if;
  if p_sessions not in (1,4,8) then raise exception 'Las sesiones deben ser 1, 4 u 8'; end if;
  if p_total < 0 then raise exception 'El monto no puede ser negativo'; end if;
  if p_payment_mode <> 'financed' or p_sessions <> 8 then
    raise exception 'Las cuotas personalizadas solo aplican a paquetes de 8 sesiones';
  end if;
  if jsonb_typeof(p_installments) <> 'array' or jsonb_array_length(p_installments) < 2 then
    raise exception 'Debe indicar al menos dos cuotas';
  end if;

  for v_item in select value from jsonb_array_elements(p_installments) loop
    v_amount := round(coalesce((v_item->>'amount')::numeric, 0), 2);
    if v_amount <= 0 then raise exception 'Cada cuota debe ser mayor a cero'; end if;
    v_sum := v_sum + v_amount;
  end loop;
  if abs(v_sum - round(p_total,2)) > 0.01 then
    raise exception 'Las cuotas deben sumar el total del paquete';
  end if;

  select greatest(coalesce(nullif(value,'')::integer,21),1) into v_interval
  from janastudio.system_settings where key='laser_session_interval_days';
  v_interval := coalesce(v_interval,21);
  select id into v_staff from janastudio.staff where auth_user_id=auth.uid() and active limit 1;

  insert into janastudio.client_packages(
    client_id,service_id,total_sessions,used_sessions,status,total_amount,expires_at,session_interval_days
  ) values (
    p_client_id,p_service_id,p_sessions,0,'active',p_total,v_exp,v_interval
  ) returning id into v_pkg;

  v_first := round((p_installments->0->>'amount')::numeric,2);
  v_allocation := coalesce(p_installments->0->>'allocation','worker');
  insert into janastudio.transactions(
    description,amount,type,category,payment_method,exchange_rate,currency,metadata,created_by_staff_id,client_id
  ) values (
    'Venta paquete laser',v_first,'income','Centro Laser',p_payment_method,p_exchange_rate,'USD',
    jsonb_build_object(
      'client_package_id',v_pkg,'service_id',p_service_id,'total_sessions',p_sessions,
      'installment_number',1,'laser_allocation',v_allocation,'custom_installments',true
    ),v_staff,p_client_id
  ) returning id into v_tx;

  for v_item in select value from jsonb_array_elements(p_installments) loop
    v_number := v_number + 1;
    v_amount := round((v_item->>'amount')::numeric,2);
    v_due := coalesce(nullif(v_item->>'due_at','')::timestamptz, now() + ((v_number - 1) * v_interval || ' days')::interval);
    insert into janastudio.package_installments(
      client_package_id,installment_number,amount,status,paid_at,due_at,payment_method,transaction_id
    ) values (
      v_pkg,v_number,v_amount,
      case when v_number=1 then 'paid' else 'pending' end,
      case when v_number=1 then now() else null end,
      v_due,
      case when v_number=1 then p_payment_method else null end,
      case when v_number=1 then v_tx else null end
    );
  end loop;
  return v_pkg;
end $$;

grant execute on function janastudio.sell_laser_package_custom(
  uuid,uuid,integer,numeric,text,text,numeric,jsonb
) to authenticated;
