-- СПГfoto: explicitly allow authenticated authors to read their own submissions.
-- This is additive and does not expose pending/rejected photos to other users.
drop policy if exists "Authors can read own photos" on public.photos;
create policy "Authors can read own photos"
  on public.photos
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.photos to authenticated;
grant select on public.photos to anon;
