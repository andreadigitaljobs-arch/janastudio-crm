-- Staff avatars are rendered in many different shapes/sizes across the app
-- (round avatars, tall rectangle cards, portrait drawers). Without knowing
-- where the person's face is in the uploaded photo, object-fit: cover crops
-- inconsistently and often cuts off the face. This lets whoever uploads the
-- photo pick a focal point (as a percentage of the image) that every avatar
-- can center on via CSS object-position.
alter table janastudio.staff
  add column if not exists photo_focal_x smallint not null default 50,
  add column if not exists photo_focal_y smallint not null default 30;
