-- СПГfoto: автор фотографии.
-- Аддитивное изменение: существующие записи сохраняются.
alter table public.photos
  add column if not exists photographer text;
