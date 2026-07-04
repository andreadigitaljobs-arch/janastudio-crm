-- Historical checkout records stored the wash flag but did not identify the
-- assistant. Alexandra was the only assistant for this period, so attach only
-- wash transactions that do not already contain an assistant.
do $$
declare
  v_assistant_id uuid;
  v_assistant_name text;
  v_assistant_role text;
  v_washing_rate numeric;
begin
  select id, name, role, coalesce(washing_rate, 1)
    into v_assistant_id, v_assistant_name, v_assistant_role, v_washing_rate
  from public.staff
  where active = true
    and lower(trim(name)) = 'alexandra'
    and (
      lower(role) like '%asistente%'
      or lower(role) like '%lavado%'
      or lower(role) like '%operaciones%'
    )
  limit 1;

  if v_assistant_id is null then
    raise exception 'Active assistant Alexandra was not found; historical washes were not changed';
  end if;

  update public.transactions t
  set metadata = jsonb_set(
    coalesce(t.metadata, '{}'::jsonb),
    '{staffInvolved}',
    (
      case
        when jsonb_typeof(t.metadata->'staffInvolved') = 'array'
          then t.metadata->'staffInvolved'
        else '[]'::jsonb
      end
    ) || jsonb_build_array(jsonb_build_object(
      'staffId', v_assistant_id::text,
      'name', v_assistant_name,
      'role', v_assistant_role,
      'commissionEarned',
        (
          case
            when coalesce(t.metadata->>'washCount', '') ~ '^[0-9]+([.][0-9]+)?$'
              then greatest((t.metadata->>'washCount')::numeric, 1)
            else 1
          end
        ) * v_washing_rate,
      'productCommissionEarned', 0,
      'tip', 0
    )),
    true
  )
  where t.type = 'income'
    and (
      lower(coalesce(t.metadata->>'didWash', '')) in ('true', 'si', 'sí', 'yes')
      or (
        coalesce(t.metadata->>'washCount', '') ~ '^[0-9]+([.][0-9]+)?$'
        and (t.metadata->>'washCount')::numeric > 0
      )
    )
    and not exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(t.metadata->'staffInvolved') = 'array'
            then t.metadata->'staffInvolved'
          else '[]'::jsonb
        end
      ) member
      where member->>'staffId' = v_assistant_id::text
        or lower(coalesce(member->>'role', '')) like '%asistente%'
        or lower(coalesce(member->>'role', '')) like '%lavado%'
        or lower(coalesce(member->>'role', '')) like '%operaciones%'
    );
end
$$;
