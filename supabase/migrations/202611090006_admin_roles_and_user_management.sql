-- СПГfoto: database-backed staff roles and owner-only user administration.
-- Additive migration. Existing content and accounts are preserved.

create table if not exists public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','moderator')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now()
);
alter table public.app_user_roles enable row level security;
drop policy if exists "Users can read own app role" on public.app_user_roles;
create policy "Users can read own app role" on public.app_user_roles
  for select to authenticated using (auth.uid() = user_id);
grant select on public.app_user_roles to authenticated;

create or replace function public.current_app_role()
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare v_role text;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) = 'zero12anton@mail.ru' then
    return 'owner';
  end if;
  select role into v_role from public.app_user_roles where user_id = auth.uid();
  return coalesce(v_role, 'user');
end;
$$;
revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.list_app_users()
returns table(user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, role text)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_app_role() <> 'owner' then
    raise exception 'Только главный администратор может просматривать список пользователей';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
      case when lower(coalesce(u.email,'')) = 'zero12anton@mail.ru' then 'owner'
           else coalesce(r.role, 'user') end
    from auth.users u
    left join public.app_user_roles r on r.user_id = u.id
    order by u.created_at desc;
end;
$$;
revoke all on function public.list_app_users() from public;
grant execute on function public.list_app_users() to authenticated;

create or replace function public.set_app_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_email text;
begin
  if public.current_app_role() <> 'owner' then
    raise exception 'Назначать роли может только главный администратор';
  end if;
  if p_role not in ('user','admin','moderator') then
    raise exception 'Недопустимая роль';
  end if;
  select email into v_email from auth.users where id = p_user_id;
  if not found then raise exception 'Пользователь не найден'; end if;
  if lower(coalesce(v_email,'')) = 'zero12anton@mail.ru' then
    raise exception 'Роль главного администратора нельзя изменить';
  end if;
  if p_role = 'user' then
    delete from public.app_user_roles where user_id = p_user_id;
  else
    insert into public.app_user_roles(user_id,role,assigned_by,assigned_at)
    values(p_user_id,p_role,auth.uid(),now())
    on conflict(user_id) do update set role=excluded.role, assigned_by=excluded.assigned_by, assigned_at=now();
  end if;
end;
$$;
revoke all on function public.set_app_user_role(uuid,text) from public;
grant execute on function public.set_app_user_role(uuid,text) to authenticated;

-- Keep authorization in PostgreSQL/RLS, not only in the browser.
do $$
declare t text;
begin
  foreach t in array array['depots','vehicle_units','vehicle_history','transport_models','vehicle_consists','consist_vehicles','transport_routes','route_stops','route_vehicle_assignments'] loop
    execute format('drop policy if exists "Only configured admin can add depots" on public.%I', t);
    execute format('drop policy if exists "Only configured admin can update depots" on public.%I', t);
    execute format('drop policy if exists "Only configured admin can delete depots" on public.%I', t);
    execute format('drop policy if exists "Only configured admin can add vehicle units" on public.%I', t);
    execute format('drop policy if exists "Only configured admin can update vehicle units" on public.%I', t);
    execute format('drop policy if exists "Only configured admin can delete vehicle units" on public.%I', t);
    execute format('drop policy if exists "Admin manages %I" on public.%I', t, t);
    execute format('drop policy if exists "Staff manages %I" on public.%I', t, t);
    execute format(
      'create policy "Staff manages %I" on public.%I for all to authenticated using (public.current_app_role() in (''owner'',''admin'')) with check (public.current_app_role() in (''owner'',''admin''))',
      t,t
    );
  end loop;
end $$;

-- Moderators can review photo submissions; only owner/admin can manage reference data.
drop policy if exists "Staff moderates photos" on public.photos;
create policy "Staff moderates photos" on public.photos for update to authenticated
  using (public.current_app_role() in ('owner','admin','moderator'))
  with check (public.current_app_role() in ('owner','admin','moderator'));

create or replace function public.transfer_vehicle_depot(
  p_vehicle_id uuid, p_new_depot_id uuid,
  p_event_date date default current_date, p_description text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_old_depot_id uuid; v_old_name text; v_new_name text; v_fleet_number text;
begin
  if public.current_app_role() not in ('owner','admin') then
    raise exception 'Недостаточно прав для передачи вагона';
  end if;
  select depot_id, fleet_number into v_old_depot_id, v_fleet_number
    from public.vehicle_units where id=p_vehicle_id for update;
  if not found then raise exception 'Транспортная единица не найдена'; end if;
  if v_old_depot_id=p_new_depot_id then raise exception 'Вагон уже приписан к этому депо'; end if;
  select name into v_old_name from public.depots where id=v_old_depot_id;
  select name into v_new_name from public.depots where id=p_new_depot_id;
  if v_new_name is null then raise exception 'Новое депо не найдено'; end if;
  update public.vehicle_units set depot_id=p_new_depot_id,updated_at=now() where id=p_vehicle_id;
  insert into public.vehicle_history(vehicle_id,event_date,event_type,title,description,old_value,new_value,created_by)
  values(p_vehicle_id,coalesce(p_event_date,current_date),'Смена депо','Передача вагона №'||v_fleet_number,p_description,coalesce(v_old_name,'Депо не указано'),v_new_name,auth.uid());
end;
$$;
revoke all on function public.transfer_vehicle_depot(uuid,uuid,date,text) from public;
grant execute on function public.transfer_vehicle_depot(uuid,uuid,date,text) to authenticated;
