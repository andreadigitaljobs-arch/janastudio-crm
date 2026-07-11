-- The janastudio.clients table was never migrated from the original nail/skin
-- salon template to the hair-salon fields the frontend (ClientModule.jsx)
-- actually reads and writes: hair_type, scalp_type, image_url, work_gallery,
-- work_comparisons. This adds the missing columns (additive only, nothing is
-- dropped or renamed) and updates get_clients_with_stats() to expose them.

alter table janastudio.clients
  add column if not exists hair_type text default 'Normal',
  add column if not exists scalp_type text default 'Normal',
  add column if not exists image_url text,
  add column if not exists work_gallery jsonb not null default '[]'::jsonb,
  add column if not exists work_comparisons jsonb not null default '[]'::jsonb;

drop function if exists janastudio.get_clients_with_stats();

create function janastudio.get_clients_with_stats()
returns table(
  id uuid,
  name text,
  phone text,
  id_card text,
  created_at timestamptz,
  birth_date text,
  hair_type text,
  scalp_type text,
  image_url text,
  allergies text,
  notes text,
  active boolean,
  created_by_staff_id uuid,
  total_visits bigint,
  total_spent numeric
)
language sql
stable
set search_path to 'janastudio'
as $function$
  select
    c.id, c.name, c.phone, c.id_card, c.created_at,
    c.birth_date, c.hair_type, c.scalp_type, c.image_url,
    c.allergies, c.notes, c.active, c.created_by_staff_id,
    count(a.id)::bigint as total_visits,
    coalesce(sum(a.total_price), 0) as total_spent
  from janastudio.clients c
  left join janastudio.appointments a on a.client_id = c.id
    and a.status in ('Completado')
    and a.service_id is not null
  group by c.id
  order by c.created_at desc;
$function$;
