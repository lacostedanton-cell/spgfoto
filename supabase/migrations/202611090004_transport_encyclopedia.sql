-- СПГfoto: расширенная транспортная энциклопедия.
-- Аддитивная миграция: существующие фото, депо и vehicle_units не удаляются.
-- Администратор проекта: zero12anton@mail.ru

create table if not exists public.transport_models (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  manufacturer text,
  country text,
  years_produced text,
  description text,
  created_at timestamptz not null default now(),
  unique(category, name, manufacturer)
);

create table if not exists public.vehicle_consists (
  id uuid primary key default gen_random_uuid(),
  depot_id uuid references public.depots(id) on delete set null,
  name text not null,
  category text not null default 'Метро',
  model text,
  operator text,
  home_depot text,
  status text not null default 'В эксплуатации',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consist_vehicles (
  id uuid primary key default gen_random_uuid(),
  consist_id uuid not null references public.vehicle_consists(id) on delete cascade,
  vehicle_id uuid not null references public.vehicle_units(id) on delete cascade,
  position integer not null check(position > 0),
  coupled_from date,
  coupled_until date,
  created_at timestamptz not null default now(),
  unique(consist_id, position),
  unique(consist_id, vehicle_id)
);

create index if not exists consist_vehicles_vehicle_idx on public.consist_vehicles(vehicle_id);
create index if not exists consist_vehicles_order_idx on public.consist_vehicles(consist_id, position);

create table if not exists public.vehicle_history (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicle_units(id) on delete cascade,
  event_date date,
  event_type text not null,
  title text not null,
  description text,
  old_value text,
  new_value text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists vehicle_history_vehicle_date_idx on public.vehicle_history(vehicle_id, event_date desc);

create table if not exists public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  country text,
  route_number text not null,
  category text not null,
  name text,
  operator text,
  status text not null default 'Действует',
  description text,
  created_at timestamptz not null default now()
);
create index if not exists transport_routes_city_idx on public.transport_routes(country, city, category, route_number);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.transport_routes(id) on delete cascade,
  stop_name text not null,
  position integer not null check(position > 0),
  direction text,
  latitude double precision,
  longitude double precision,
  unique(route_id, position, direction)
);

create table if not exists public.route_vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.transport_routes(id) on delete cascade,
  vehicle_id uuid not null references public.vehicle_units(id) on delete cascade,
  assigned_from date,
  assigned_until date,
  notes text
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  city text,
  country text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists photo_comments_photo_date_idx on public.photo_comments(photo_id, created_at);

create table if not exists public.photo_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, photo_id)
);

-- Public read for encyclopedia records.
do $$
declare t text;
begin
  foreach t in array array['transport_models','vehicle_consists','consist_vehicles','vehicle_history','transport_routes','route_stops','route_vehicle_assignments','photo_comments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Public can read %I" on public.%I', t, t);
    execute format('create policy "Public can read %I" on public.%I for select using (true)', t, t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- Only the configured administrator can maintain the shared reference data.
do $$
declare t text;
begin
  foreach t in array array['transport_models','vehicle_consists','consist_vehicles','vehicle_history','transport_routes','route_stops','route_vehicle_assignments'] loop
    execute format('drop policy if exists "Admin manages %I" on public.%I', t, t);
    execute format(
      'create policy "Admin manages %I" on public.%I for all to authenticated using (lower(coalesce(auth.jwt() ->> ''email'', '''')) = ''zero12anton@mail.ru'') with check (lower(coalesce(auth.jwt() ->> ''email'', '''')) = ''zero12anton@mail.ru'')',
      t, t
    );
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.user_profiles enable row level security;
drop policy if exists "Profiles are public" on public.user_profiles;
create policy "Profiles are public" on public.user_profiles for select using (true);
drop policy if exists "Users manage own profile" on public.user_profiles;
create policy "Users manage own profile" on public.user_profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select on public.user_profiles to anon, authenticated;
grant insert, update, delete on public.user_profiles to authenticated;

alter table public.photo_comments enable row level security;
drop policy if exists "Signed-in users can comment" on public.photo_comments;
create policy "Signed-in users can comment" on public.photo_comments for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users delete own comments" on public.photo_comments;
create policy "Users delete own comments" on public.photo_comments for delete to authenticated
  using (auth.uid() = user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = 'zero12anton@mail.ru');
grant insert, delete on public.photo_comments to authenticated;

alter table public.photo_favorites enable row level security;
drop policy if exists "Users read own favorites" on public.photo_favorites;
create policy "Users read own favorites" on public.photo_favorites for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users add own favorites" on public.photo_favorites;
create policy "Users add own favorites" on public.photo_favorites for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users remove own favorites" on public.photo_favorites;
create policy "Users remove own favorites" on public.photo_favorites for delete to authenticated using (auth.uid() = user_id);
grant select, insert, delete on public.photo_favorites to authenticated;
