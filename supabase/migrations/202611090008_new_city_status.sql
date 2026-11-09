-- Add the "new in this city" state without changing existing records.
alter table public.photos
  drop constraint if exists photos_vehicle_status_check;
alter table public.photos
  add constraint photos_vehicle_status_check
  check (vehicle_status in (
    'Работает',
    'Не работает',
    'Новый / не был в эксплуатации в этом городе',
    'Выведен из эксплуатации',
    'Памятник/тренажёр',
    'Списан'
  ));

alter table public.vehicle_units
  drop constraint if exists vehicle_units_status_check;
alter table public.vehicle_units
  add constraint vehicle_units_status_check
  check (status in (
    'Работает',
    'Не работает',
    'Новый / не был в эксплуатации в этом городе',
    'Выведен из эксплуатации',
    'Памятник/тренажёр',
    'Списан'
  ));
