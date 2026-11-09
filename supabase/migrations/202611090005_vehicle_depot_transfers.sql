-- СПГfoto: атомарная передача транспортной единицы между депо.
create or replace function public.transfer_vehicle_depot(
  p_vehicle_id uuid,
  p_new_depot_id uuid,
  p_event_date date default current_date,
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_depot_id uuid;
  v_old_name text;
  v_new_name text;
  v_fleet_number text;
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'zero12anton@mail.ru' then
    raise exception 'Недостаточно прав для передачи вагона';
  end if;
  select depot_id, fleet_number into v_old_depot_id, v_fleet_number
  from public.vehicle_units where id = p_vehicle_id for update;
  if not found then raise exception 'Транспортная единица не найдена'; end if;
  if v_old_depot_id = p_new_depot_id then raise exception 'Вагон уже приписан к этому депо'; end if;
  select name into v_old_name from public.depots where id = v_old_depot_id;
  select name into v_new_name from public.depots where id = p_new_depot_id;
  if v_new_name is null then raise exception 'Новое депо не найдено'; end if;
  update public.vehicle_units set depot_id = p_new_depot_id, updated_at = now() where id = p_vehicle_id;
  insert into public.vehicle_history(vehicle_id,event_date,event_type,title,description,old_value,new_value,created_by)
  values(p_vehicle_id,coalesce(p_event_date,current_date),'Смена депо','Передача вагона №'||v_fleet_number,p_description,coalesce(v_old_name,'Депо не указано'),v_new_name,auth.uid());
end;
$$;
revoke all on function public.transfer_vehicle_depot(uuid,uuid,date,text) from public;
grant execute on function public.transfer_vehicle_depot(uuid,uuid,date,text) to authenticated;
