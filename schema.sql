-- СПГfoto database schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.site_admins (
  email text primary key
);
alter table public.site_admins enable row level security;
create policy "Admins can view own admin record" on public.site_admins
for select to authenticated
using (lower(auth.jwt()->>'email') = lower(email));

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  city text,
  vehicle_model text,
  vehicle_number text,
  shot_date date,
  description text,
  image_url text not null,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.photos enable row level security;

create policy "Public reads approved and users read own photos" on public.photos
for select using (
  status = 'approved'
  or auth.uid() = user_id
  or exists(select 1 from public.site_admins a where lower(a.email)=lower(auth.jwt()->>'email'))
);
create policy "Signed-in users submit pending photos" on public.photos
for insert to authenticated
with check (auth.uid() = user_id and status = 'pending');
create policy "Admins moderate photos" on public.photos
for update to authenticated
using (exists(select 1 from public.site_admins a where lower(a.email)=lower(auth.jwt()->>'email')))
with check (exists(select 1 from public.site_admins a where lower(a.email)=lower(auth.jwt()->>'email')));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('photos','photos',true,12582912,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
create policy "Public can view photo files" on storage.objects
for select using (bucket_id='photos');
create policy "Users upload into own folder" on storage.objects
for insert to authenticated
with check (bucket_id='photos' and (storage.foldername(name))[1] = auth.uid()::text);
