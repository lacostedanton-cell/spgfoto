-- СПГfoto: full depot and fleet directory.
-- Additive migration: existing depots, photos and storage objects are preserved.
create table if not exists public.vehicle_units (
  id uuid primary key default gen_random_uuid(),
  depot_id uuid not null references public.depots(id) on delete cascade,
  fleet_number text not null,
  model text not null,
  manufacturer text,
  year_built integer,
  serial_number text,
  category text not null,
  status text not null default 'Работает',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_units_status_check check (status in (
    'Работает','Не работает','Выведен из эксплуатации','Памятник/тренажёр','Списан'
  ))
);

create unique index if not exists vehicle_units_depot_fleet_number_idx
  on public.vehicle_units(depot_id, fleet_number);
create index if not exists vehicle_units_depot_id_idx on public.vehicle_units(depot_id);
create index if not exists vehicle_units_category_idx on public.vehicle_units(category);

alter table public.photos
  add column if not exists vehicle_id uuid references public.vehicle_units(id) on delete set null;
create index if not exists photos_vehicle_id_idx on public.photos(vehicle_id);

alter table public.vehicle_units enable row level security;
drop policy if exists "Vehicle units are viewable by everyone" on public.vehicle_units;
create policy "Vehicle units are viewable by everyone"
  on public.vehicle_units for select using (true);

drop policy if exists "Only configured admin can add vehicle units" on public.vehicle_units;
create policy "Only configured admin can add vehicle units"
  on public.vehicle_units for insert to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'zero12anton@mail.ru');

drop policy if exists "Only configured admin can update vehicle units" on public.vehicle_units;
create policy "Only configured admin can update vehicle units"
  on public.vehicle_units for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'zero12anton@mail.ru')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'zero12anton@mail.ru');

drop policy if exists "Only configured admin can delete vehicle units" on public.vehicle_units;
create policy "Only configured admin can delete vehicle units"
  on public.vehicle_units for delete to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'zero12anton@mail.ru');

grant select on public.vehicle_units to anon, authenticated;
grant insert, update, delete on public.vehicle_units to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
