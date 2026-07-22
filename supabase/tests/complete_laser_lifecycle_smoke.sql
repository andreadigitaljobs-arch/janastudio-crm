-- Ejecutar con ON_ERROR_STOP. Todo se revierte; no deja datos ficticios.
begin;

do $$
declare
  v_auth uuid;
  v_client uuid;
  v_service uuid;
  v_package uuid;
  v_appointment uuid;
  v_appointment_service uuid;
  v_installment uuid;
  v_staff_one uuid;
  v_staff_two uuid;
  v_operational_service uuid;
  v_inventory uuid;
  v_promotion uuid;
  v_operational_appointment uuid;
  v_checkout jsonb;
  v_value numeric;
  v_count integer;
  v_status text;
begin
  select auth_user_id into v_auth from janastudio.staff
  where auth_user_id is not null and active limit 1;
  if v_auth is null then raise exception 'No hay personal autenticado para la prueba'; end if;
  perform set_config('request.jwt.claim.sub',v_auth::text,true);
  select id into v_staff_one from janastudio.staff where auth_user_id=v_auth;

  insert into janastudio.clients(name,phone,id_card)
  values('__CODEX_SMOKE_LASER__','000-smoke','SMOKE-LASER') returning id into v_client;
  select id into v_service from janastudio.services
  where active and laser_price_8 is not null limit 1;
  if v_service is null then raise exception 'No existe servicio laser para la prueba'; end if;

  -- Flujo operativo general: walk-in, dos especialistas, pago mixto, receta,
  -- comisiones, promoción y tasa histórica en una sola operación ficticia.
  insert into janastudio.staff(name,display_name,role,commission_pct,active)
  values('__CODEX_SMOKE_STAFF__','Smoke Staff','Especialista',40,true) returning id into v_staff_two;
  insert into janastudio.inventory(name,category,stock,cost,price,unit,is_for_sale,min_stock,location,package_size,expected_services)
  values('__CODEX_SMOKE_SUPPLY__','Insumos',10,10,0,'unidad',false,1,'studio',10,20) returning id into v_inventory;
  insert into janastudio.services(name,price,duration_minutes,category,commission_pct,description)
  values('__CODEX_SMOKE_SERVICE__',10,60,'Prueba',40,'Servicio reversible') returning id into v_operational_service;
  insert into janastudio.service_costs(service_id,inventory_item_id,item_name,quantity_per_service,unit_cost,unit)
  values(v_operational_service,v_inventory,'__CODEX_SMOKE_SUPPLY__',.5,1,'unidad');
  insert into janastudio.promotions(name,description,discount_type,discount_value,starts_at,ends_at,scope,active)
  values('__CODEX_SMOKE_PROMO__','Promoción reversible','fixed',2,now()-interval '1 day',now()+interval '1 day','all',true)
  returning id into v_promotion;
  v_operational_appointment:=janastudio.create_appointment_order(
    jsonb_build_object('client_id',v_client,'status','En Silla','notes','WALK-IN agregado en recepción'),
    jsonb_build_array(
      jsonb_build_object('service_id',v_operational_service,'staff_id',v_staff_one,'price_paid',10,'scheduled_at',now(),'duration_minutes',60),
      jsonb_build_object('service_id',v_operational_service,'staff_id',v_staff_two,'price_paid',10,'scheduled_at',now(),'duration_minutes',60)
    )
  );
  select count(*) into v_count from janastudio.appointment_services where appointment_id=v_operational_appointment;
  if v_count<>2 then raise exception 'La visita simultánea no conservó sus dos servicios'; end if;
  select total_price into v_value from janastudio.appointments where id=v_operational_appointment and notes like 'WALK-IN%';
  if v_value<>20 then raise exception 'El walk-in no quedó enlazado o totalizado'; end if;

  v_checkout:=janastudio.process_checkout_atomic(jsonb_build_object(
    'appointmentId',v_operational_appointment,'appointmentIds',jsonb_build_array(v_operational_appointment),
    'clientId',v_client,'clientName','__CODEX_SMOKE_LASER__','serviceName','Servicios simultáneos',
    'totalUsd',18,'originalAmount',20,'promotionId',v_promotion,'promotionName','__CODEX_SMOKE_PROMO__','discountAmount',2,
    'fixedRate',200,'isMixed',true,'cashUsd',3,'transferBs',3000,'totalTips',0,
    'staffInvolved',jsonb_build_array(
      jsonb_build_object('staffId',v_staff_one,'commissionEarned',4,'tip',0),
      jsonb_build_object('staffId',v_staff_two,'commissionEarned',4,'tip',0)
    ),'products','[]'::jsonb,'packageConsumptions','[]'::jsonb
  ),gen_random_uuid());
  select stock into v_value from janastudio.inventory where id=v_inventory;
  if v_value<>9 then raise exception 'La receta no descontó exactamente una unidad'; end if;
  select count(*) into v_count from janastudio.appointment_staff where appointment_id=v_operational_appointment;
  if v_count<>2 then raise exception 'No se guardaron las dos comisiones'; end if;
  select count(*) into v_count from janastudio.transactions where id=(v_checkout->>'transaction_id')::uuid
    and payment_method='Mixto' and exchange_rate=200 and amount=18;
  if v_count<>1 then raise exception 'El pago mixto o la tasa histórica son incorrectos'; end if;
  select count(*) into v_count from janastudio.promotion_redemptions where promotion_id=v_promotion and discount_amount=2;
  if v_count<>1 then raise exception 'La promoción no quedó reflejada en la rentabilidad'; end if;

  v_package:=janastudio.sell_laser_package(v_client,v_service,8,100,'financed','Efectivo',200);

  select count(*) into v_count from janastudio.package_installments
  where client_package_id=v_package and amount in(30,40) and due_at is not null;
  if v_count<>3 then raise exception 'Plan 30/40/30 incorrecto'; end if;
  select count(*) into v_count from janastudio.package_installments pi
  join janastudio.client_packages cp on cp.id=pi.client_package_id
  where pi.client_package_id=v_package and(
    (pi.installment_number=2 and pi.due_at::date<>cp.created_at::date+21) or
    (pi.installment_number=3 and pi.due_at::date<>cp.created_at::date+42));
  if v_count<>0 then raise exception 'Las cuotas no vencen en dias 21 y 42'; end if;

  select worker_amount into v_value from janastudio.laser_revenue_allocations where client_package_id=v_package;
  if v_value<>30 then raise exception 'Primera cuota no asignada completamente a trabajadora'; end if;
  select count(*) into v_count from janastudio.payables_receivables where client_id=v_client and status='pending';
  if v_count<>2 then raise exception 'Las cuotas pendientes no llegaron a cuentas por cobrar'; end if;

  select id into v_installment from janastudio.package_installments where client_package_id=v_package and installment_number=2;
  perform janastudio.pay_package_installment(v_installment,'Pago Movil',200);
  select coalesce(sum(partner_supplies_amount),0) into v_value from janastudio.laser_revenue_allocations where client_package_id=v_package;
  if v_value<>40 then raise exception 'Segunda cuota no asignada completamente a socia'; end if;
  select id into v_installment from janastudio.package_installments where client_package_id=v_package and installment_number=3;
  perform janastudio.pay_package_installment(v_installment,'Zelle',200);
  select coalesce(sum(studio_amount),0) into v_value from janastudio.laser_revenue_allocations where client_package_id=v_package;
  if v_value<>30 then raise exception 'Tercera cuota no asignada completamente al estudio'; end if;

  v_appointment:=janastudio.create_appointment_order(
    jsonb_build_object('client_id',v_client,'status','Agendado','notes','Smoke laser'),
    jsonb_build_array(jsonb_build_object(
      'service_id',v_service,'staff_id',janastudio.current_staff_id(),'price_paid',0,
      'scheduled_at',now(),'duration_minutes',30,'client_package_id',v_package,
      'package_supplies_cost',5,'before_photo_url','smoke/before.jpg','after_photo_url','smoke/after.jpg'
    ))
  );
  select id into v_appointment_service from janastudio.appointment_services where appointment_id=v_appointment;
  update janastudio.appointment_services set status='Completado',completed_at=now() where id=v_appointment_service;
  update janastudio.appointment_services set status='Completado' where id=v_appointment_service;
  select used_sessions into v_count from janastudio.client_packages where id=v_package;
  if v_count<>1 then raise exception 'La sesión no fue consumida exactamente una vez'; end if;
  select supplies_cost into v_value from janastudio.package_sessions where appointment_service_id=v_appointment_service;
  if v_value<>5 then raise exception 'El costo de insumos no quedó ligado a la sesión'; end if;
  select count(*) into v_count from janastudio.package_sessions
  where appointment_service_id=v_appointment_service and before_photo_url='smoke/before.jpg' and after_photo_url='smoke/after.jpg';
  if v_count<>1 then raise exception 'Las fotos no quedaron ligadas a la sesión'; end if;

  update janastudio.client_packages set expires_at=now()-interval '1 day' where id=v_package;
  perform janastudio.process_laser_package_lifecycle(now());
  select status,expired_sessions into v_status,v_count from janastudio.client_packages where id=v_package;
  if v_status<>'expired' or v_count<>7 then raise exception 'El vencimiento o las sesiones perdidas son incorrectos'; end if;

  select count(*) into v_count from cron.job where jobname='janastudio-laser-lifecycle';
  if v_count<>1 then raise exception 'No quedó programada la automatización diaria'; end if;
end $$;

rollback;
