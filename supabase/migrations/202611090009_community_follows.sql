-- Социальные функции сообщества: подписки на авторов.
create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint user_follows_no_self check (follower_id <> followed_id)
);
alter table public.user_follows enable row level security;
drop policy if exists "Users read own follows" on public.user_follows;
create policy "Users read own follows" on public.user_follows for select to authenticated using (auth.uid() = follower_id);
drop policy if exists "Users follow from own account" on public.user_follows;
create policy "Users follow from own account" on public.user_follows for insert to authenticated with check (auth.uid() = follower_id);
drop policy if exists "Users unfollow from own account" on public.user_follows;
create policy "Users unfollow from own account" on public.user_follows for delete to authenticated using (auth.uid() = follower_id);
grant select, insert, delete on public.user_follows to authenticated;
create index if not exists user_follows_followed_idx on public.user_follows(followed_id);
