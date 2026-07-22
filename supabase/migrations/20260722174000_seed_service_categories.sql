begin;

insert into janastudio.system_settings (key, value, updated_at)
values (
  'service_categories',
  '[{"name":"Cejas","icon":"Brush"},{"name":"Pestañas","icon":"Sparkles"},{"name":"Uñas","icon":"NailPolish"}]',
  now()
)
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;

commit;
