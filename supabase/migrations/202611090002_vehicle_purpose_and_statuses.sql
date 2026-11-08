-- СПГfoto: expanded vehicle purpose and status fields.
-- Additive migration: existing photos and storage objects are preserved.
alter table public.photos
  add column if not exists vehicle_purpose text,
  add column if not exists vehicle_extra_status text;

alter table public.photos
  drop constraint if exists photos_vehicle_status_check;
alter table public.photos
  add constraint photos_vehicle_status_check
  check (vehicle_status in (
    'Работает',
    'Не работает',
    'Выведен из эксплуатации',
    'Памятник/тренажёр',
    'Списан'
  ));

alter table public.photos
  drop constraint if exists photos_vehicle_purpose_check;
alter table public.photos
  add constraint photos_vehicle_purpose_check
  check (vehicle_purpose is null or vehicle_purpose in ('Пассажирский', 'Служебный'));

alter table public.photos
  drop constraint if exists photos_vehicle_extra_status_check;
alter table public.photos
  add constraint photos_vehicle_extra_status_check
  check (
    vehicle_extra_status is null
    or (category = 'Электрички' and vehicle_extra_status = 'Расформирован')
  );
