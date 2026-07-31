-- Excepción explícita y auditable para profesionales que pueden atender
-- servicios compatibles de forma simultánea.
alter table janastudio.appointment_services
  add column if not exists allow_overlap boolean not null default false;

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
      client_package_id,package_supplies_cost,before_photo_url,after_photo_url,allow_overlap
    ) values (
      v_id,(v_service->>'service_id')::uuid,(v_service->>'staff_id')::uuid,
      coalesce((v_service->>'sequence_order')::integer,0),coalesce((v_service->>'price_paid')::numeric,0),
      (v_service->>'scheduled_at')::timestamptz,greatest(coalesce((v_service->>'duration_minutes')::integer,60),1),'Pendiente',
      nullif(v_service->>'client_package_id','')::uuid,coalesce((v_service->>'package_supplies_cost')::numeric,0),
      nullif(v_service->>'before_photo_url',''),nullif(v_service->>'after_photo_url',''),
      coalesce((v_service->>'allow_overlap')::boolean,false)
    );
  end loop;
  return v_id;
end $$;

grant execute on function janastudio.create_appointment_order(jsonb,jsonb) to authenticated;
