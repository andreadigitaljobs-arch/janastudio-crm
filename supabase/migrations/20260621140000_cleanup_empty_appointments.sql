-- Remove checkout shells: completed appointments without service, value or sold items.
begin;

create temporary table empty_appointment_cleanup on commit drop as
select a.id
from public.appointments a
where a.status = 'Completado'
  and a.service_id is null
  and coalesce(a.total_price, 0) = 0
  and not exists (
    select 1 from public.appointment_extras ae where ae.appointment_id = a.id
  )
  and not exists (
    select 1 from public.appointment_products ap where ap.appointment_id = a.id
  );

-- Preserve financial records while removing stale JSON references.
update public.transactions t
set metadata = coalesce(t.metadata, '{}'::jsonb) - 'appointment_id'
where t.metadata->>'appointment_id' in (
  select id::text from empty_appointment_cleanup
);

delete from public.appointment_staff ast
using empty_appointment_cleanup c
where ast.appointment_id = c.id;

delete from public.appointments a
using empty_appointment_cleanup c
where a.id = c.id;

commit;