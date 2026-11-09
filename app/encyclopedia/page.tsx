'use client';
import './encyclopedia.css';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Vehicle={id:string;depot_id:string;fleet_number:string;model:string;manufacturer:string|null;category:string;status:string;year_built:number|null};
type Depot={id:string;name:string;city:string|null;country:string|null};
type Consist={id:string;name:string;category:string;model:string|null;operator:string|null;status:string;home_depot:string|null};
type Route={id:string;city:string;country:string|null;route_number:string;category:string;name:string|null;operator:string|null;status:string};
type Model={id:string;category:string;name:string;manufacturer:string|null;country:string|null;years_produced:string|null};
type Stop={route_id:string;stop_name:string;position:number;direction:string|null};
const tabs=['Подвижной состав','Составы','Маршруты','Модели'];
export default function EncyclopediaPage(){
 const [tab,setTab]=useState(tabs[0]); const [query,setQuery]=useState('');
 const [vehicles,setVehicles]=useState<Vehicle[]>([]); const [depots,setDepots]=useState<Depot[]>([]);
 const [consists,setConsists]=useState<Consist[]>([]); const [routes,setRoutes]=useState<Route[]>([]);
 const [models,setModels]=useState<Model[]>([]); const [stops,setStops]=useState<Stop[]>([]);
 const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 useEffect(()=>{(async()=>{
  setLoading(true);setError('');
  const [v,d,c,r,m,s]=await Promise.all([
   supabase.from('vehicle_units').select('id,depot_id,fleet_number,model,manufacturer,category,status,year_built').order('fleet_number'),
   supabase.from('depots').select('id,name,city,country').order('name'),
   supabase.from('vehicle_consists').select('id,name,category,model,operator,status,home_depot').order('name'),
   supabase.from('transport_routes').select('id,city,country,route_number,category,name,operator,status').order('city').order('route_number'),
   supabase.from('transport_models').select('id,category,name,manufacturer,country,years_produced').order('name'),
   supabase.from('route_stops').select('route_id,stop_name,position,direction').order('position')
  ]);
  const err=[v.error,d.error,c.error,r.error,m.error,s.error].find(Boolean);
  if(err)setError(err.message);
  setVehicles((v.data||[]) as Vehicle[]);setDepots((d.data||[]) as Depot[]);setConsists((c.data||[]) as Consist[]);
  setRoutes((r.data||[]) as Route[]);setModels((m.data||[]) as Model[]);setStops((s.data||[]) as Stop[]);
  setLoading(false);
 })()},[]);
 const filteredVehicles=useMemo(()=>vehicles.filter(x=>[x.fleet_number,x.model,x.manufacturer,x.category,x.status].join(' ').toLowerCase().includes(query.toLowerCase())),[vehicles,query]);
 const filteredConsists=useMemo(()=>consists.filter(x=>[x.name,x.category,x.model,x.operator,x.home_depot].join(' ').toLowerCase().includes(query.toLowerCase())),[consists,query]);
 const filteredRoutes=useMemo(()=>routes.filter(x=>[x.city,x.country,x.route_number,x.category,x.name,x.operator].join(' ').toLowerCase().includes(query.toLowerCase())),[routes,query]);
 const filteredModels=useMemo(()=>models.filter(x=>[x.category,x.name,x.manufacturer,x.country].join(' ').toLowerCase().includes(query.toLowerCase())),[models,query]);
 return <main className="encyPage">
  <header className="encyTop"><Link className="brand" href="/">СПГ<span>foto</span></Link><nav><Link href="/">Главная</Link><Link href="/depots">Депо и парки</Link></nav><span>ТРАНСПОРТНАЯ ЭНЦИКЛОПЕДИЯ</span></header>
  <section className="encyHero"><p className="eyebrow">ЕДИНЫЙ СПРАВОЧНИК</p><h1>Транспортная<br/><em>энциклопедия.</em></h1><p>Реестр каждой машины, история составов, маршруты и технические модели в одной базе.</p><div className="encyStats"><div><b>{vehicles.length}</b><span>машин</span></div><div><b>{consists.length}</b><span>составов</span></div><div><b>{routes.length}</b><span>маршрутов</span></div><div><b>{models.length}</b><span>моделей</span></div></div></section>
  <section className="encyContent"><div className="encyHeading"><div><p className="eyebrow">БАЗА ДАННЫХ</p><h2>Каталоги</h2></div><span>{loading?'Загрузка…':'Данные обновляются из реестра'}</span></div>
   <div className="encyTabs">{tabs.map(t=><button key={t} className={tab===t?'selected':''} onClick={()=>{setTab(t);setQuery('')}}>{t}</button>)}</div>
   <input className="encySearch" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по номеру, модели, городу, маршруту…"/>
   {error&&<p className="encyError">Не удалось загрузить часть справочников: {error}. Проверь, что SQL-миграция энциклопедии выполнена.</p>}
   {loading?<p className="encyEmpty">Загружаем справочники…</p>:<>
    {tab===tabs[0]&&(filteredVehicles.length?<div className="encyGrid">{filteredVehicles.map(v=>{const d=depots.find(x=>x.id===v.depot_id);return <article className="encyCard" key={v.id}><div className="encyCardTop"><span>{v.category}</span><span>↗</span></div><h3>{v.model}</h3><a className="fleetNo" href={'/vehicles/'+encodeURIComponent(v.id)}>№ {v.fleet_number} · Открыть карточку</a><p>{[v.manufacturer,v.year_built].filter(Boolean).join(' · ')}</p><small>{d?.name||'Депо не указано'}{d?.city?' · '+d.city:''}</small><span className="encyStatus">{v.status}</span><Link href={'/vehicles/'+v.id}>Открыть карточку →</Link></article>})}</div>:<p className="encyEmpty">Машин пока нет. Добавь подвижной состав в карточке депо.</p>)}
    {tab===tabs[1]&&(filteredConsists.length?<div className="encyGrid">{filteredConsists.map(c=><article className="encyCard" key={c.id}><div className="encyCardTop"><span>{c.category}</span><span>СОСТАВ</span></div><h3>{c.name}</h3><p>{[c.model,c.operator].filter(Boolean).join(' · ')}</p><small>{c.home_depot||'Депо не указано'}</small><span className="encyStatus">{c.status}</span></article>)}</div>:<p className="encyEmpty">Составы пока не зарегистрированы.</p>)}
    {tab===tabs[2]&&(filteredRoutes.length?<div className="routeList">{filteredRoutes.map(r=>{const routeStops=stops.filter(s=>s.route_id===r.id).sort((a,b)=>a.position-b.position);return <article className="routeCard" key={r.id}><div className="routeNumber">{r.route_number}</div><div className="routeMain"><span>{r.category} · {r.city}{r.country?', '+r.country:''}</span><h3>{r.name||'Маршрут '+r.route_number}</h3><p>{r.operator||'Перевозчик не указан'} · {r.status}</p>{routeStops.length>0&&<div className="stopLine">{routeStops.map((s,i)=><span key={s.route_id+'-'+s.position}>{i>0?' → ':''}{s.stop_name}</span>)}</div>}</div></article>})}</div>:<p className="encyEmpty">Маршруты пока не добавлены.</p>)}
    {tab===tabs[3]&&(filteredModels.length?<div className="encyGrid">{filteredModels.map(m=><article className="encyCard" key={m.id}><div className="encyCardTop"><span>{m.category}</span><span>МОДЕЛЬ</span></div><h3>{m.name}</h3><p>{m.manufacturer||'Производитель не указан'}</p><small>{[m.country,m.years_produced].filter(Boolean).join(' · ')}</small></article>)}</div>:<p className="encyEmpty">Справочник моделей пока пуст.</p>)}
   </>}
  </section>
  <footer className="encyFooter"><Link href="/">СПГ<span>foto</span></Link><span>Вымышленная транспортная база · 2026</span></footer>
 </main>;
}
