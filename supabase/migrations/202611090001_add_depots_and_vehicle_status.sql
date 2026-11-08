-- СПГfoto additive migration: depots and vehicle condition
-- Run once in Supabase SQL Editor. Existing photos and storage objects are preserved.
alter table public.photos
  add column if not exists depot text,
  add column if not exists vehicle_status text not null default 'Работает';

alter table public.photos
  drop constraint if exists photos_vehicle_status_check;
alter table public.photos
  add constraint photos_vehicle_status_check
  check (vehicle_status in ('Работает', 'Не работает', 'Списан'));

create table if not exists public.depots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  country text,
  transport_type text,
  created_at timestamptz not null default now()
);

alter table public.depots enable row level security;
drop policy if exists "Depots are viewable by everyone" on public.depots;
create policy "Depots are viewable by everyone"
  on public.depots for select using (true);

drop policy if exists "Only configured admin can add depots" on public.depots;
create policy "Only configured admin can add depots"
  on public.depots for insert
  to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'zero12anton@mail.ru');

drop policy if exists "Only configured admin can update depots" on public.depots;
create policy "Only configured admin can update depots"
  on public.depots for update
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'zero12anton@mail.ru')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'zero12anton@mail.ru');

drop policy if exists "Only configured admin can delete depots" on public.depots;
create policy "Only configured admin can delete depots"
  on public.depots for delete
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'zero12anton@mail.ru');

grant select on public.depots to anon, authenticated;
grant insert, update, delete on public.depots to authenticated;
