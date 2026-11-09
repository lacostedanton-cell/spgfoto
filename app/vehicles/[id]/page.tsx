'use client';
import '../vehicle.css';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {supabase} from '@/lib/supabase';
type Vehicle={id:string;depot_id:string;fleet_number:string;model:string;manufacturer:string|null;year_built:number|null;serial_number:string|null;category:string;status:string;notes:string|null};
type Depot={id:string;name:string;city:string|null;country:string|null};
type History={id:string;event_date:string|null;event_type:string;title:string;description:string|null;old_value:string|null;new_value:string|null};
type Photo={id:string;title:string;image_url:string;shot_date:string|null;description:string|null};
const statuses=['Работает','Не работает','Новый / не был в эксплуатации в этом городе','Выведен из эксплуатации','Памятник/тренажёр','Списан'];
export default function VehiclePage(){
 const params=useParams();const id=String(params.id);const [vehicle,setVehicle]=useState<Vehicle|null>(null);const [depot,setDepot]=useState<Depot|null>(null);const [history,setHistory]=useState<History[]>([]);const [photos,setPhotos]=useState<Photo[]>([]);const [depots,setDepots]=useState<Depot[]>([]);const [user,setUser]=useState<any>(null);const [message,setMessage]=useState('');const [transferDepot,setTransferDepot]=useState('');const [transferDate,setTransferDate]=useState(new Date().toISOString().slice(0,10));const [transferNote,setTransferNote]=useState('');const [editing,setEditing]=useState<History|null>(null);
 const [event,setEvent]=useState({event_date:new Date().toISOString().slice(0,10),event_type:'Изменение состояния',title:'',description:'',old_value:'',new_value:''});
 const [isAdmin,setIsAdmin]=useState(false);
 async function load(){const {data:v,error}=await supabase.from('vehicle_units').select('*').eq('id',id).maybeSingle();if(error){setMessage(error.message);return;}setVehicle(v as Vehicle|null);if(!v)return;const [d,all,h,p]=await Promise.all([supabase.from('depots').select('id,name,city,country').eq('id',v.depot_id).maybeSingle(),supabase.from('depots').select('id,name,city,country').order('name'),supabase.from('vehicle_history').select('id,event_date,event_type,title,description,old_value,new_value').eq('vehicle_id',id).order('event_date',{ascending:false}),supabase.from('photos').select('id,title,image_url,shot_date,description').eq('vehicle_id',id).eq('status','approved').order('shot_date',{ascending:false})]);setDepot(d.data as Depot|null);setDepots((all.data||[]) as Depot[]);setHistory((h.data||[]) as History[]);setPhotos((p.data||[]) as Photo[]);if(h.error||p.error)setMessage((h.error||p.error)?.message||'');}
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setUser(data.user));const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user??null));return()=>subscription.unsubscribe();},[]);
 useEffect(()=>{let active=true;if(!user){setIsAdmin(false);return;}supabase.rpc('current_app_role').then(({data,error})=>{if(active)setIsAdmin(!error&&(data==='owner'||data==='admin'));});return()=>{active=false;};},[user]);
 useEffect(()=>{if(id)load()},[id]);
 useEffect(()=>{if(vehicle&&window.location.hash==='#history'){requestAnimationFrame(()=>document.getElementById('history')?.scrollIntoView({behavior:'smooth',block:'start'}));}},[vehicle,history.length]);
 async function updateStatus(status:string){if(!vehicle)return;const {error}=await supabase.from('vehicle_units').update({status,updated_at:new Date().toISOString()}).eq('id',id);setMessage(error?.message||'Состояние обновлено');if(!error){await supabase.from('vehicle_history').insert({vehicle_id:id,event_type:'Изменение состояния',title:'Изменено состояние',old_value:vehicle.status,new_value:status,event_date:new Date().toISOString().slice(0,10),created_by:user.id});load();}}

 async function transferVehicle(){if(!transferDepot||!vehicle)return;const {error}=await supabase.rpc('transfer_vehicle_depot',{p_vehicle_id:id,p_new_depot_id:transferDepot,p_event_date:transferDate||null,p_description:transferNote||null});setMessage(error?.message||'Вагон переведён, история обновлена');if(!error){setTransferNote('');await load();}}
 async function saveHistoryEdit(e:React.FormEvent){e.preventDefault();if(!editing)return;const {error}=await supabase.from('vehicle_history').update({event_date:editing.event_date,event_type:editing.event_type,title:editing.title,description:editing.description,old_value:editing.old_value,new_value:editing.new_value}).eq('id',editing.id);setMessage(error?.message||'Запись изменена');if(!error){setEditing(null);load();}}
 async function deleteHistoryItem(item:History){if(!window.confirm('Удалить запись истории?'))return;const {error}=await supabase.from('vehicle_history').delete().eq('id',item.id);setMessage(error?.message||'Запись удалена');if(!error)load();}
 async function addEvent(e:React.FormEvent){e.preventDefault();const {error}=await supabase.from('vehicle_history').insert({vehicle_id:id,...event,created_by:user.id,event_date:event.event_date||null,description:event.description||null,old_value:event.old_value||null,new_value:event.new_value||null});setMessage(error?.message||'Запись истории добавлена');if(!error){setEvent({...event,title:'',description:'',old_value:'',new_value:''});load();}}
 const statusColors:Record<string,string>={'Работает':'#FFFFFF','Не работает':'#F5D547','Новый / не был в эксплуатации в этом городе':'#39B96B','Выведен из эксплуатации':'#A0A4AA','Памятник/тренажёр':'#F28C32','Списан':'#D94343'};
 const statusColor=statusColors[vehicle?.status||'']||'#D9E0E7';
 const depotEvents=history.filter(h=>h.event_type==='Смена депо');
 const historyRows=[...depotEvents].reverse();
 if(!vehicle)return <main className="vehiclePage"><header><Link href="/">СПГ<span>foto</span></Link><Link href="/encyclopedia">← Энциклопедия</Link></header><div className="vehicleBody">{message||'Загружаем карточку транспортной единицы…'}</div></main>;
 return <main className="vehiclePage vehicleReferencePage">
 <header><Link href="/">СПГ<span>foto</span></Link><nav><Link href="/encyclopedia">Энциклопедия</Link><Link href="/depots">Депо и парки</Link></nav></header>
 <div className="referenceWrap">
 <h1 className="referenceTitle">{depot?.city||'Город не указан'}, {vehicle.category.toLowerCase()} № {vehicle.fleet_number}</h1>
 <div className="referenceDepotTable">
 <table><thead><tr><th>Город</th><th>Депо/Парк</th><th>№</th><th>С...</th><th>По...</th><th>Примечание</th></tr></thead><tbody>
 <tr><td>{depot?.city||'—'}</td><td>{depot?.name||'—'}</td><td><b>{vehicle.fleet_number}</b></td><td>{vehicle.year_built?String(vehicle.year_built):'—'}</td><td>—</td><td>{vehicle.notes||'—'}</td></tr>
 {historyRows.map(h=><tr key={h.id}><td>{depot?.city||'—'}</td><td>{h.new_value||h.title}</td><td>{vehicle.fleet_number}</td><td>{h.event_date||'—'}</td><td>—</td><td>{h.description||'Смена депо'}</td></tr>)}
 </tbody></table></div>
 <div className="referencePassport">
 <table><tbody>
 <tr><th>Город:</th><td><b>{depot?.city||'Не указан'}</b>{depot?.country?' · '+depot.country:''}</td></tr>
 <tr><th>Депо/Парк:</th><td><b>{depot?.name||'Не указано'}</b></td></tr>
 <tr><th>Модель:</th><td><b>{vehicle.model}</b></td></tr>
 <tr><th>Производитель:</th><td>{vehicle.manufacturer||'Не указан'}</td></tr>
 <tr><th>Построен:</th><td><b>{vehicle.year_built||'Не указан'}</b></td></tr>
 <tr><th>Заводской номер:</th><td>{vehicle.serial_number||'Не указан'}</td></tr>
 <tr><th>Текущее состояние:</th><td><span className="referenceStatus"><i style={{background:statusColor,border:statusColor==='#FFFFFF'?'1px solid #999':'1px solid transparent'}} />{vehicle.status}</span>{isAdmin&&<select className="referenceStatusSelect" value={vehicle.status} onChange={e=>updateStatus(e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select>}</td></tr>
 <tr><th>Назначение:</th><td>{vehicle.category}</td></tr>
 {vehicle.notes&&<tr><th>Примечание:</th><td>{vehicle.notes}</td></tr>}
 </tbody></table>
 <div id="history" className="referenceHistory"><h3>История</h3>{history.length?<ul>{[...history].reverse().map(h=><li key={h.id}><b>{h.event_date||'Дата не указана'}</b> — {h.title}{h.description?': '+h.description:''}{(h.old_value||h.new_value)?' ('+(h.old_value||'—')+' → '+(h.new_value||'—')+')':''}{isAdmin&&<> <button type="button" onClick={()=>setEditing({...h})}>Изменить</button><button type="button" onClick={()=>deleteHistoryItem(h)}>Удалить</button></>}</li>)}</ul>:<p>История эксплуатации пока не заполнена.</p>}</div>
 </div>
 <section className="referenceVideos"><h2>Видео с этим ТС:</h2><div className="referenceEmpty">Видео для этой транспортной единицы пока не добавлены.</div></section>
 <div className="referencePhotoTools"><span>Фотографии: {photos.length}</span><span>Опубликованные фотографии · СПГfoto</span></div>
 <section className="referenceGallery">{photos.length?photos.map(p=><article className="referencePhoto" key={p.id}><img src={p.image_url} alt={p.title}/><div><p className="referencePhotoTitle">{p.title}</p><b>{depot?.name||'Депо не указано'}</b><p>{p.shot_date||'Дата съёмки не указана'}</p>{p.description&&<small>{p.description}</small>}</div></article>):<div className="referenceEmpty">Для этого ТС пока нет опубликованных фотографий.</div>}</section>
 {isAdmin&&<section className="referenceAdmin">
 <div className="vehiclePanel"><p className="eyebrow">АДМИНИСТРАТОР · ПЕРЕДАЧА</p><h2>Передать в другое депо</h2><p>Текущее депо: <b>{depot?.name||'не указано'}</b>.</p><form className="historyForm" onSubmit={e=>{e.preventDefault();transferVehicle();}}><select required value={transferDepot} onChange={e=>setTransferDepot(e.target.value)}><option value="">Выбери новое депо…</option>{depots.filter(d=>d.id!==vehicle.depot_id).map(d=><option key={d.id} value={d.id}>{d.name}{d.city?' · '+d.city:''}</option>)}</select><input type="date" value={transferDate} onChange={e=>setTransferDate(e.target.value)}/><textarea placeholder="Примечание к передаче" value={transferNote} onChange={e=>setTransferNote(e.target.value)}/><button disabled={!transferDepot}>Оформить передачу</button></form></div>
 {editing&&<div className="vehiclePanel"><h2>Редактировать запись истории</h2><form className="historyForm" onSubmit={saveHistoryEdit}><input type="date" value={editing.event_date||''} onChange={e=>setEditing({...editing,event_date:e.target.value})}/><select value={editing.event_type} onChange={e=>setEditing({...editing,event_type:e.target.value})}>{['Изменение состояния','Смена депо','Смена окраски','Изменение номера','Ремонт','Модернизация','Списание','Прочее'].map(x=><option key={x}>{x}</option>)}</select><input required value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/><input placeholder="Было" value={editing.old_value||''} onChange={e=>setEditing({...editing,old_value:e.target.value})}/><input placeholder="Стало" value={editing.new_value||''} onChange={e=>setEditing({...editing,new_value:e.target.value})}/><textarea placeholder="Описание" value={editing.description||''} onChange={e=>setEditing({...editing,description:e.target.value})}/><button>Сохранить изменения</button><button type="button" onClick={()=>setEditing(null)}>Отмена</button></form></div>}
 <div className="vehiclePanel"><h2>Добавить событие в историю</h2><form className="historyForm" onSubmit={addEvent}><input type="date" value={event.event_date} onChange={e=>setEvent({...event,event_date:e.target.value})}/><select value={event.event_type} onChange={e=>setEvent({...event,event_type:e.target.value})}>{['Изменение состояния','Смена депо','Смена окраски','Изменение номера','Ремонт','Модернизация','Списание','Прочее'].map(x=><option key={x}>{x}</option>)}</select><input required placeholder="Заголовок события" value={event.title} onChange={e=>setEvent({...event,title:e.target.value})}/><input placeholder="Было" value={event.old_value} onChange={e=>setEvent({...event,old_value:e.target.value})}/><input placeholder="Стало" value={event.new_value} onChange={e=>setEvent({...event,new_value:e.target.value})}/><textarea placeholder="Подробности" value={event.description} onChange={e=>setEvent({...event,description:e.target.value})}/><button>Сохранить событие</button></form></div>
 </section>}
 {message&&<p className="vehicleMessage">{message}</p>}
 </div><footer>СПГ<span>foto</span> · Вымышленная транспортная база</footer></main>;
}