-- JanaStudio: Auto restocking alerts and inventory usage rate
begin;

-- RPC: get items that need restocking
create or replace function janastudio.get_low_stock_items()
returns table (
  id uuid,
  name text,
  stock numeric,
  min_stock numeric,
  category text,
  unit text,
  days_until_stockout numeric,
  avg_daily_usage numeric
)
language sql stable
set search_path = janastudio, pg_temp
as $$
  with usage_rates as (
    select
      im.product_id,
      coalesce(sum(im.amount) / greatest(
        extract(day from (now() - min(im.created_at))),
        1
      ), 0) as avg_daily
    from janastudio.inventory_movements im
    where im.type = 'exit'
      and im.created_at > now() - interval '30 days'
    group by im.product_id
  )
  select
    i.id,
    i.name,
    i.stock,
    coalesce(i.min_stock, 5) as min_stock,
    i.category,
    i.unit,
    case when ur.avg_daily > 0 then
      round(i.stock / ur.avg_daily, 0)
    else null end as days_until_stockout,
    round(ur.avg_daily, 2) as avg_daily_usage
  from janastudio.inventory i
  left join usage_rates ur on ur.product_id = i.id
  where i.active = true
    and i.stock <= coalesce(i.min_stock, 5)
  order by i.stock asc;
$$;

grant execute on function janastudio.get_low_stock_items() to authenticated;

-- RPC: get usage rate per inventory item
create or replace function janastudio.get_inventory_usage_rates()
returns table (
  product_id uuid,
  avg_daily_usage numeric,
  total_exits_30d numeric
)
language sql stable
set search_path = janastudio, pg_temp
as $$
  select
    im.product_id,
    coalesce(sum(im.amount) / greatest(
      extract(day from (now() - min(im.created_at))),
      1
    ), 0) as avg_daily_usage,
    coalesce(sum(im.amount), 0) as total_exits_30d
  from janastudio.inventory_movements im
  where im.type = 'exit'
    and im.created_at > now() - interval '30 days'
  group by im.product_id;
$$;

grant execute on function janastudio.get_inventory_usage_rates() to authenticated;

commit;
