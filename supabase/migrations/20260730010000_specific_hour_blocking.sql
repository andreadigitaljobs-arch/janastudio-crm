-- Specific Hour Blocking: add start_time/end_time to staff_time_off
-- Null values = full day off (backwards compatible)

ALTER TABLE janastudio.staff_time_off
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time;
