alter table janastudio.services
  add column if not exists included_items text[] not null default '{}'::text[];

comment on column janastudio.services.included_items is
  'Checklist operativo incluido en el servicio, por ejemplo lavado o tratamiento.';

notify pgrst, 'reload schema';
