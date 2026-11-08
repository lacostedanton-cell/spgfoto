create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  city text,
  vehicle_number text,
  image_url text not null,
  user_email text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;
alter table public.site_admins enable row level security;

create policy "Anyone can view approved photos"
on public.photos for select
using (status = 'approved');

create policy "Users can submit photos"
on public.photos for insert
with check (status = 'pending');

create policy "Admins can view all photos"
on public.photos for select
using (
  exists (
    select 1 from public.site_admins
    where site_admins.user_id = auth.uid()
  )
);

create policy "Admins can update photos"
on public.photos for update
using (
  exists (
    select 1 from public.site_admins
    where site_admins.user_id = auth.uid()
  )
);

create policy "Admins can view own admin record"
on public.site_admins for select
using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "Public can view photo files"
on storage.objects for select
using (bucket_id = 'photos');

create policy "Authenticated users can upload photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photos');
