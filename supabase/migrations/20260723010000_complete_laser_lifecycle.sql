-- Cierre operativo de paquetes laser: sesiones, cuotas, reparto, fotos y vencimiento.
begin;

alter table janastudio.appointment_services
  add column if not exists client_package_id uuid references janastudio.client_packages(id) on delete set null,
  add column if not exists package_supplies_cost numeric not null default 0,
  add column if not exists before_photo_url text,
  add column if not exists after_photo_url text;

alter table janastudio.package_sessions
  add column if not exists appointment_service_id uuid references janastudio.appointment_services(id) on delete set null;

create unique index if not exists package_sessions_one_per_appointment_service_uidx
  on janastudio.package_sessions(appointment_service_id)
  where appointment_service_id is not null;

alter table janastudio.client_packages
  add column if not exists expired_at timestamptz,
  add column if not exists expired_sessions integer not null default 0,
  add column if not exists warning_notified_at timestamptz;

alter table janastudio.payables_receivables
  add column if not exists package_installment_id uuid references janastudio.package_installments(id) on delete cascade;
create unique index if not exists payables_receivables_package_installment_uidx
  on janastudio.payables_receivables(package_installment_id)
  where package_installment_id is not null;

insert into janastudio.system_settings(key,value,updated_at) values
  ('laser_expiration_warning_days','30',now()),
  ('laser_session_interval_days','21',now()),
  ('laser_late_policy','Reprogramar sin consumir la sesion hasta que el servicio sea completado.',now()),
  ('laser_commission_recognition','Reconocer cada parte cuando se cobra su cuota correspondiente.',now())
on conflict(key) do nothing;

-- Las fotos son privadas y solo puede operarlas personal autenticado de JanaStudio.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('janastudio-laser-progress','janastudio-laser-progress',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists janastudio_laser_progress_select on storage.objects;
create policy janastudio_laser_progress_select on storage.objects for select to authenticated
using(bucket_id='janastudio-laser-progress' and janastudio.is_active_staff());
drop policy if exists janastudio_laser_progress_insert on storage.objects;
create policy janastudio_laser_progress_insert on storage.objects for insert to authenticated
with check(bucket_id='janastudio-laser-progress' and janastudio.is_active_staff());
drop policy if exists janastudio_laser_progress_update on storage.objects;
create policy janastudio_laser_progress_update on storage.objects for update to authenticated
using(bucket_id='janastudio-laser-progress' and janastudio.is_active_staff())
with check(bucket_id='janastudio-laser-progress' and janastudio.is_active_staff());
drop policy if exists janastudio_laser_progress_delete on storage.objects;
create policy janastudio_laser_progress_delete on storage.objects for delete to authenticated
using(bucket_id='janastudio-laser-progress' and janastudio.is_active_staff());

create or replace function janastudio.create_appointment_order(p_appointment jsonb, p_services jsonb)
returns uuid language plpgsql security definer set search_path = janastudio, pg_temp as $$
declare v_id uuid; v_service jsonb; v_first_service jsonb; v_first timestamptz; v_staff uuid; v_total numeric;
begin
  if not janastudio.is_active_staff() then raise exception 'Unauthorized'; end if;
  select min((value->>'scheduled_at')::timestamptz) into v_first
  from jsonb_array_elements(coalesce(p_services, '[]'::jsonb));
  select value into v_first_service from jsonb_array_elements(coalesce(p_services,'[]'::jsonb))
  order by coalesce((value->>'sequence_order')::integer,0) limit 1;
  select coalesce(sum(coalesce((value->>'price_paid')::numeric,0)),0) into v_total
  from jsonb_array_elements(coalesce(p_services,'[]'::jsonb));
  select id into v_staff from janastudio.staff where auth_user_id = auth.uid() and active limit 1;
  insert into janastudio.appointments(client_id,service_id,staff_id,status,total_price,scheduled_at,notes,created_by_staff_id)
  values((p_appointment->>'client_id')::uuid,
    nullif(v_first_service->>'service_id','')::uuid,nullif(v_first_service->>'staff_id','')::uuid,
    coalesce(p_appointment->>'status','Agendado'),coalesce(nullif(p_appointment->>'total_price','')::numeric,v_total),
    coalesce(v_first,(p_appointment->>'scheduled_at')::timestamptz),
    p_appointment->>'notes',v_staff) returning id into v_id;
  for v_service in select value from jsonb_array_elements(coalesce(p_services,'[]'::jsonb)) loop
    insert into janastudio.appointment_services(
      appointment_id,service_id,staff_id,sequence_order,price_paid,scheduled_at,duration_minutes,status,
      client_package_id,package_supplies_cost,before_photo_url,after_photo_url
    ) values (
      v_id,(v_service->>'service_id')::uuid,(v_service->>'staff_id')::uuid,
      coalesce((v_service->>'sequence_order')::integer,0),coalesce((v_service->>'price_paid')::numeric,0),
      (v_service->>'scheduled_at')::timestamptz,greatest(coalesce((v_service->>'duration_minutes')::integer,60),1),'Pendiente',
      nullif(v_service->>'client_package_id','')::uuid,coalesce((v_service->>'package_supplies_cost')::numeric,0),
      nullif(v_service->>'before_photo_url',''),nullif(v_service->>'after_photo_url','')
    );
  end loop;
  return v_id;
end $$;

create or replace function janastudio.allocate_laser_revenue()
returns trigger language plpgsql security definer set search_path=janastudio,pg_temp as $$
declare v_pkg janastudio.client_packages%rowtype; v_allocation text;
begin
  if new.type<>'income' or new.category<>'Centro Laser' then return new; end if;
  select * into v_pkg from janastudio.client_packages
  where id=nullif(new.metadata->>'client_package_id','')::uuid;
  v_allocation:=coalesce(new.metadata->>'laser_allocation','full');
  insert into janastudio.laser_revenue_allocations(
    transaction_id,client_package_id,worker_amount,partner_supplies_amount,studio_amount
  ) values (
    new.id,v_pkg.id,
    case when v_allocation='worker' then new.amount when v_allocation='full' then new.amount*coalesce(v_pkg.worker_pct,30)/100 else 0 end,
    case when v_allocation='partner' then new.amount when v_allocation='full' then new.amount*coalesce(v_pkg.partner_pct,40)/100 else 0 end,
    case when v_allocation='studio' then new.amount when v_allocation='full' then new.amount*coalesce(v_pkg.studio_pct,30)/100 else 0 end
  ) on conflict(transaction_id) do update set
    client_package_id=excluded.client_package_id,worker_amount=excluded.worker_amount,
    partner_supplies_amount=excluded.partner_supplies_amount,studio_amount=excluded.studio_amount;
  return new;
end $$;

create or replace function janastudio.sell_laser_package(
  p_client_id uuid,p_service_id uuid,p_sessions integer,p_total numeric,
  p_payment_mode text,p_payment_method text,p_exchange_rate numeric
) returns uuid language plpgsql security definer set search_path=janastudio,pg_temp as $$
declare v_pkg uuid;v_tx uuid;v_initial numeric;v_staff uuid;v_exp timestamptz:=now()+interval '10 months';v_financed boolean;v_interval integer:=21;
begin
  if not janastudio.is_active_staff() then raise exception 'Unauthorized'; end if;
  if p_sessions not in(1,4,8) then raise exception 'Las sesiones deben ser 1, 4 u 8'; end if;
  if p_total<0 then raise exception 'El monto no puede ser negativo'; end if;
  v_financed:=p_payment_mode='financed' and p_sessions=8;
  select greatest(coalesce(nullif(value,'')::integer,21),1) into v_interval
  from janastudio.system_settings where key='laser_session_interval_days';
  v_interval:=coalesce(v_interval,21);
  select id into v_staff from janastudio.staff where auth_user_id=auth.uid() and active limit 1;
  v_initial:=case when v_financed then round(p_total*.30,2) else p_total end;
  insert into janastudio.client_packages(client_id,service_id,total_sessions,used_sessions,status,total_amount,expires_at,session_interval_days)
  values(p_client_id,p_service_id,p_sessions,0,'active',p_total,v_exp,v_interval) returning id into v_pkg;
  insert into janastudio.transactions(description,amount,type,category,payment_method,exchange_rate,currency,metadata,created_by_staff_id,client_id)
  values('Venta paquete laser',v_initial,'income','Centro Laser',p_payment_method,p_exchange_rate,'USD',
    jsonb_build_object('client_package_id',v_pkg,'service_id',p_service_id,'total_sessions',p_sessions,
      'installment_number',1,'laser_allocation',case when v_financed then 'worker' else 'full' end),v_staff,p_client_id)
  returning id into v_tx;
  if v_financed then
    insert into janastudio.package_installments(client_package_id,installment_number,amount,status,paid_at,due_at,payment_method,transaction_id) values
      (v_pkg,1,round(p_total*.30,2),'paid',now(),now(),p_payment_method,v_tx),
      (v_pkg,2,round(p_total*.40,2),'pending',null,now()+interval '21 days',null,null),
      (v_pkg,3,p_total-round(p_total*.30,2)-round(p_total*.40,2),'pending',null,now()+interval '42 days',null,null);
  else
    insert into janastudio.package_installments(client_package_id,installment_number,amount,status,paid_at,due_at,payment_method,transaction_id)
    values(v_pkg,1,p_total,'paid',now(),now(),p_payment_method,v_tx);
  end if;
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
      'laser_allocation',case v_inst.installment_number when 1 then 'worker' when 2 then 'partner' else 'studio' end),
    v_staff,v_pkg.client_id) returning id into v_tx;
  update janastudio.package_installments set status='paid',paid_at=now(),payment_method=p_method,transaction_id=v_tx where id=v_inst.id;
  return v_tx;
end $$;

create or replace function janastudio.sync_laser_receivable()
returns trigger language plpgsql security definer set search_path=janastudio,pg_temp as $$
declare v_name text;
begin
  select c.name into v_name from janastudio.client_packages cp join janastudio.clients c on c.id=cp.client_id
  where cp.id=new.client_package_id;
  if new.status='pending' then
    insert into janastudio.payables_receivables(kind,counterparty,description,amount,paid_amount,due_date,status,client_id,package_installment_id)
    select 'receivable',coalesce(v_name,'Clienta'),'Cuota laser '||new.installment_number,new.amount,0,new.due_at::date,'pending',cp.client_id,new.id
    from janastudio.client_packages cp where cp.id=new.client_package_id
    on conflict(package_installment_id) where package_installment_id is not null do update
      set amount=excluded.amount,due_date=excluded.due_date,status='pending',counterparty=excluded.counterparty;
  else
    update janastudio.payables_receivables set paid_amount=amount,status='paid' where package_installment_id=new.id;
  end if;
  return new;
end $$;
drop trigger if exists sync_laser_receivable_trigger on janastudio.package_installments;
create trigger sync_laser_receivable_trigger after insert or update of status,amount,due_at on janastudio.package_installments
for each row execute function janastudio.sync_laser_receivable();

create or replace function janastudio.consume_laser_package_session()
returns trigger language plpgsql security definer set search_path=janastudio,pg_temp as $$
declare v_pkg janastudio.client_packages%rowtype;v_inserted integer;
begin
  if new.client_package_id is null or new.status<>'Completado' or old.status='Completado' then return new; end if;
  select * into v_pkg from janastudio.client_packages where id=new.client_package_id for update;
  if v_pkg.id is null then raise exception 'Paquete laser no encontrado'; end if;
  if v_pkg.expires_at<=now() or v_pkg.status='expired' then raise exception 'El paquete laser esta vencido'; end if;
  if v_pkg.used_sessions>=v_pkg.total_sessions then raise exception 'El paquete no tiene sesiones disponibles'; end if;
  insert into janastudio.package_sessions(
    client_package_id,appointment_id,appointment_service_id,consumed_at,scheduled_at,notes,supplies_cost,
    before_photo_url,after_photo_url,staff_id
  ) values (
    v_pkg.id,new.appointment_id,new.id,coalesce(new.completed_at,now()),new.scheduled_at,
    'Consumo automatico al completar el servicio',new.package_supplies_cost,new.before_photo_url,new.after_photo_url,new.staff_id
  ) on conflict(appointment_service_id) where appointment_service_id is not null do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted>0 then
    update janastudio.client_packages set used_sessions=used_sessions+1,
      status=case when used_sessions+1>=total_sessions then 'completed' else 'active' end
    where id=v_pkg.id;
  end if;
  return new;
end $$;
drop trigger if exists consume_laser_package_session_trigger on janastudio.appointment_services;
create trigger consume_laser_package_session_trigger after update of status on janastudio.appointment_services
for each row execute function janastudio.consume_laser_package_session();

-- Una sesión ya pagada dentro de un paquete no vuelve a generar ingreso ni comisión de servicio.
create or replace function janastudio.skip_package_session_profit_snapshot()
returns trigger language plpgsql security definer set search_path=janastudio,pg_temp as $$
begin
  if new.appointment_service_id is not null and exists(
    select 1 from janastudio.appointment_services aps
    where aps.id=new.appointment_service_id and aps.client_package_id is not null
  ) then return null; end if;
  return new;
end $$;
drop trigger if exists skip_package_session_profit_snapshot_trigger on janastudio.service_profit_snapshots;
create trigger skip_package_session_profit_snapshot_trigger before insert on janastudio.service_profit_snapshots
for each row execute function janastudio.skip_package_session_profit_snapshot();

create or replace function janastudio.process_laser_package_lifecycle(p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path=janastudio,pg_temp as $$
declare v_warning_days integer:=30;v_warned integer:=0;v_expired integer:=0;
begin
  select greatest(coalesce(nullif(value,'')::integer,30),1) into v_warning_days
  from janastudio.system_settings where key='laser_expiration_warning_days';
  v_warning_days:=coalesce(v_warning_days,30);
  with candidates as (
    select cp.id,cp.client_id,c.name,cp.total_sessions,cp.used_sessions,cp.expires_at
    from janastudio.client_packages cp join janastudio.clients c on c.id=cp.client_id
    where cp.status='active' and cp.expires_at>p_now and cp.expires_at<=p_now+make_interval(days=>v_warning_days)
      and cp.warning_notified_at is null
  ), inserted as (
    insert into janastudio.notifications(title,message,type,read,metadata)
    select 'Paquete Laser por vencer',name||' tiene '||(total_sessions-used_sessions)||' sesiones pendientes. Vence el '||to_char(expires_at,'DD/MM/YYYY')||'.',
      'warning',false,jsonb_build_object('client_package_id',id,'client_id',client_id,'expires_at',expires_at)
    from candidates returning metadata->>'client_package_id' package_id
  )
  update janastudio.client_packages cp set warning_notified_at=p_now
  where cp.id in(select package_id::uuid from inserted);
  get diagnostics v_warned=row_count;
  update janastudio.client_packages set status='expired',expired_at=p_now,
    expired_sessions=greatest(total_sessions-used_sessions,0)
  where status='active' and expires_at<=p_now;
  get diagnostics v_expired=row_count;
  return jsonb_build_object('warned',v_warned,'expired',v_expired);
end $$;

-- Corrige cuotas de prueba existentes que aun no han sido cobradas.
update janastudio.package_installments pi set due_at=cp.created_at+case pi.installment_number when 2 then interval '21 days' else interval '42 days' end
from janastudio.client_packages cp
where cp.id=pi.client_package_id and pi.status='pending' and pi.installment_number in(2,3);

-- Sincroniza las cuentas por cobrar ya existentes.
insert into janastudio.payables_receivables(kind,counterparty,description,amount,paid_amount,due_date,status,client_id,package_installment_id)
select 'receivable',c.name,'Cuota laser '||pi.installment_number,pi.amount,0,pi.due_at::date,'pending',cp.client_id,pi.id
from janastudio.package_installments pi join janastudio.client_packages cp on cp.id=pi.client_package_id
join janastudio.clients c on c.id=cp.client_id where pi.status='pending'
on conflict(package_installment_id) where package_installment_id is not null do nothing;

create or replace function janastudio.get_management_report(p_start timestamptz,p_end timestamptz)
returns jsonb language sql security definer set search_path=janastudio,pg_temp as $$
  select jsonb_build_object(
    'categories',coalesce((select jsonb_agg(x order by completed desc) from(
      select category,count(*) completed,sum(revenue) revenue,sum(salon_profit) profit
      from janastudio.service_profit_snapshots where created_at>=p_start and created_at<p_end group by category)x),'[]'::jsonb),
    'promotions',coalesce((select jsonb_agg(x order by uses desc) from(
      select p.name,count(r.id) uses,coalesce(sum(r.discount_amount),0) discount,coalesce(sum(r.final_amount),0) revenue
      from janastudio.promotions p left join janastudio.promotion_redemptions r on r.promotion_id=p.id and r.created_at>=p_start and r.created_at<p_end group by p.id,p.name)x),'[]'::jsonb),
    'laser_receivable',coalesce((select sum(amount) from janastudio.package_installments where status='pending'),0),
    'laser_split',(select jsonb_build_object(
      'worker',coalesce(sum(a.worker_amount),0),
      'partner',coalesce(sum(a.partner_supplies_amount),0)-coalesce((select sum(ps.supplies_cost) from janastudio.package_sessions ps where ps.consumed_at>=p_start and ps.consumed_at<p_end),0),
      'partner_gross',coalesce(sum(a.partner_supplies_amount),0),
      'supplies',coalesce((select sum(ps.supplies_cost) from janastudio.package_sessions ps where ps.consumed_at>=p_start and ps.consumed_at<p_end),0),
      'studio',coalesce(sum(a.studio_amount),0)) from janastudio.laser_revenue_allocations a where a.created_at>=p_start and a.created_at<p_end),
    'inventory_variance',coalesce((select jsonb_agg(x) from(
      select i.name,c.expected_services,c.services_count,(c.services_count-c.expected_services) variance,c.status
      from janastudio.inventory_containers c join janastudio.inventory i on i.id=c.inventory_item_id)x),'[]'::jsonb)
  )
$$;

grant execute on function janastudio.process_laser_package_lifecycle(timestamptz) to authenticated;
grant execute on function janastudio.create_appointment_order(jsonb,jsonb) to authenticated;
grant execute on function janastudio.sell_laser_package(uuid,uuid,integer,numeric,text,text,numeric) to authenticated;
grant execute on function janastudio.pay_package_installment(uuid,text,numeric) to authenticated;

-- Supabase self-hosted incluye pg_cron; mantiene el ciclo aunque nadie abra el CRM.
create extension if not exists pg_cron;
do $$
declare v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname='janastudio-laser-lifecycle' loop
    perform cron.unschedule(v_job);
  end loop;
  perform cron.schedule('janastudio-laser-lifecycle','15 3 * * *','select janastudio.process_laser_package_lifecycle(now());');
end $$;

commit;
