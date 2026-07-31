-- La reunión confirmó promociones por porcentaje, monto fijo o precio final.
alter table janastudio.promotions
  drop constraint if exists promotions_discount_type_check;

alter table janastudio.promotions
  add constraint promotions_discount_type_check
  check (discount_type in ('percent','fixed','direct_price'));
