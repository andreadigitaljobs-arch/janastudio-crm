-- Los planes de cobro personalizados describen como paga la clienta, no como
-- se reparte internamente el ingreso. Cada abono personalizado conserva la
-- distribucion financiera completa configurada para Centro Laser.
alter table janastudio.package_installments
  add column if not exists revenue_allocation text;

alter table janastudio.package_installments
  drop constraint if exists package_installments_revenue_allocation_check;

alter table janastudio.package_installments
  add constraint package_installments_revenue_allocation_check
  check (revenue_allocation is null or revenue_allocation in ('worker','partner','studio','full'));

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
  insert into janastudio.transactions(
    description,amount,type,category,payment_method,exchange_rate,currency,metadata,created_by_staff_id,client_id
  ) values (
    'Venta paquete laser',v_first,'income','Centro Laser',p_payment_method,p_exchange_rate,'USD',
    jsonb_build_object(
      'client_package_id',v_pkg,'service_id',p_service_id,'total_sessions',p_sessions,
      'installment_number',1,'laser_allocation','full','custom_installments',true
    ),v_staff,p_client_id
  ) returning id into v_tx;

  for v_item in select value from jsonb_array_elements(p_installments) loop
    v_number := v_number + 1;
    v_amount := round((v_item->>'amount')::numeric,2);
    v_due := coalesce(nullif(v_item->>'due_at','')::timestamptz, now() + ((v_number - 1) * v_interval || ' days')::interval);
    insert into janastudio.package_installments(
      client_package_id,installment_number,amount,status,paid_at,due_at,payment_method,transaction_id,revenue_allocation
    ) values (
      v_pkg,v_number,v_amount,
      case when v_number=1 then 'paid' else 'pending' end,
      case when v_number=1 then now() else null end,
      v_due,
      case when v_number=1 then p_payment_method else null end,
      case when v_number=1 then v_tx else null end,
      'full'
    );
  end loop;
  return v_pkg;
end $$;

create or replace function janastudio.pay_package_installment(p_installment_id uuid,p_method text,p_exchange_rate numeric)
returns uuid language plpgsql security definer set search_path=janastudio,pg_temp as $$
declare v_inst janastudio.package_installments%rowtype;v_pkg janastudio.client_packages%rowtype;v_tx uuid;v_staff uuid;v_previous_pending integer;
begin
  if not janastudio.is_active_staff() then raise exception 'Unauthorized'; end if;
  select * into v_inst from janastudio.package_installments where id=p_installment_id for update;
  if v_inst.id is null then raise exception 'Cuota no encontrada'; end if;
  if v_inst.status='paid' then return v_inst.transaction_id; end if;
  select * into v_pkg from janastudio.client_packages where id=v_inst.client_package_id for update;
  if v_pkg.status='expired' or v_pkg.expires_at<=now() then raise exception 'El paquete esta vencido'; end if;
  select count(*) into v_previous_pending from janastudio.package_installments
  where client_package_id=v_pkg.id and installment_number<v_inst.installment_number and status<>'paid';
  if v_previous_pending>0 then raise exception 'Debe cobrar primero la cuota anterior'; end if;
  select id into v_staff from janastudio.staff where auth_user_id=auth.uid() and active limit 1;
  insert into janastudio.transactions(description,amount,type,category,payment_method,exchange_rate,currency,metadata,created_by_staff_id,client_id)
  values('Cuota paquete laser '||v_inst.installment_number,v_inst.amount,'income','Centro Laser',p_method,p_exchange_rate,'USD',
    jsonb_build_object('client_package_id',v_pkg.id,'installment_id',v_inst.id,'installment_number',v_inst.installment_number,
      'laser_allocation',coalesce(v_inst.revenue_allocation,case v_inst.installment_number when 1 then 'worker' when 2 then 'partner' else 'studio' end)),
    v_staff,v_pkg.client_id) returning id into v_tx;
  update janastudio.package_installments set status='paid',paid_at=now(),payment_method=p_method,transaction_id=v_tx where id=v_inst.id;
  return v_tx;
end $$;

grant execute on function janastudio.sell_laser_package_custom(
  uuid,uuid,integer,numeric,text,text,numeric,jsonb
) to authenticated;
grant execute on function janastudio.pay_package_installment(uuid,text,numeric) to authenticated;
