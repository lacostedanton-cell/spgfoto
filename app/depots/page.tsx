'use client';
import './depot-directory.css';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Depot = { id:string; name:string; city:string|null; country:string|null; transport_type:string|null };
type Unit = { id:string; depot_id:string; fleet_number:string; model:string; category:string; status:string };
export default function DepotsPage() {
  const [depots,setDepots]=useState<Depot[]>([]);
  const [units,setUnits]=useState<Unit[]>([]);
  const [user,setUser]=useState<any>(null);
  const [search,setSearch]=useState('');
  const [kind,setKind]=useState('Все типы');
  const [form,setForm]=useState({name:'',city:'',country:'',transport_type:'Трамвай'});
  const [message,setMessage]=useState('');
  const [isAdmin,setIsAdmin]=useState(false);
  async function load(){
    const [{data:d},{data:u}]=await Promise.all([
      supabase.from('depots').select('id,name,city,country,transport_type').order('country').order('city').order('name'),
      supabase.from('vehicle_units').select('id,depot_id,fleet_number,model,category,status')
    ]);
    setDepots((d||[]) as Depot[]); setUnits((u||[]) as Unit[]);
  }
  useEffect(()=>{supabase.auth.getUser().then(({data})=>setUser(data.user)); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user??null)); return ()=>subscription.unsubscribe();},[]);
  useEffect(()=>{let active=true;if(!user){setIsAdmin(false);return;}supabase.rpc('current_app_role').then(({data,error})=>{if(active)setIsAdmin(!error&&(data==='owner'||data==='admin'));});return()=>{active=false;};},[user]);
  useEffect(()=>{load();},[]);
  const types=useMemo(()=>['Все типы',...Array.from(new Set(depots.map(d=>d.transport_type).filter((x):x is string=>!!x))).sort()],[depots]);
  const shown=useMemo(()=>depots.filter(d=>(kind==='Все типы'||d.transport_type===kind)&&[d.name,d.city,d.country,d.transport_type].join(' ').toLowerCase().includes(search.toLowerCase())),[depots,kind,search]);
  async function addDepot(e:React.FormEvent){e.preventDefault();const {error}=await supabase.from('depots').insert({name:form.name.trim(),city:form.city.trim()||null,country:form.country.trim()||null,transport_type:form.transport_type});setMessage(error?.message||'Депо добавлено');if(!error){setForm({name:'',city:'',country:'',transport_type:'Трамвай'});load();}}
  return <main className="directoryPage">
    <header className="directoryTop"><Link className="brand" href="/">СПГ<span>foto</span></Link><nav><Link href="/">Главная</Link><a href="#directory">Депо</a></nav><span className="directoryNote">ТРАНСПОРТНЫЙ СПРАВОЧНИК</span></header>
    <section className="directoryHero"><p className="eyebrow">СПРАВОЧНИК ИНФРАСТРУКТУРЫ</p><h1>Депо и парки</h1><p>Каталог вымышленных транспортных предприятий и приписанного к ним подвижного состава.</p><div className="directoryStats"><div><b>{depots.length}</b><span>депо и парка</span></div><div><b>{units.length}</b><span>единиц транспорта</span></div><div><b>{new Set(depots.map(d=>d.city).filter(Boolean)).size}</b><span>городов</span></div></div></section>
    <section id="directory" className="directoryContent"><div className="directoryHeading"><div><p className="eyebrow">КАТАЛОГ</p><h2>Все депо</h2></div><span>{shown.length} результатов</span></div>
      <div className="directoryFilters"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Найти депо, город или страну…"/><select value={kind} onChange={e=>setKind(e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select></div>
      {shown.length?<div className="depotGrid">{shown.map(d=>{const fleet=units.filter(u=>u.depot_id===d.id);return <Link className="depotCard" href={'/depots/'+d.id} key={d.id}><div className="depotCardTop"><span>{d.transport_type||'Транспорт'}</span><span>↗</span></div><h3>{d.name}</h3><p>{[d.city,d.country].filter(Boolean).join(', ')||'Местоположение не указано'}</p><div className="depotCardBottom"><b>{fleet.length}</b><span>единиц подвижного состава</span></div></Link>})}</div>:<div className="directoryEmpty">По заданным условиям депо не найдены.</div>}
    </section>
    {isAdmin&&<section className="directoryAdmin"><p className="eyebrow">АДМИНИСТРАТОР</p><h2>Добавить новое депо</h2><form onSubmit={addDepot}><input placeholder="Название депо" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="Город" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/><input placeholder="Страна" value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/><select value={form.transport_type} onChange={e=>setForm({...form,transport_type:e.target.value})}>{['Трамвай','Троллейбус','Автобус','Метро','Железная дорога','Другое'].map(x=><option key={x}>{x}</option>)}</select><button>Создать депо</button></form>{message&&<p>{message}</p>}</section>}
    <footer className="directoryFooter"><Link href="/">СПГ<span>foto</span></Link><span>Вымышленная база транспорта · 2026</span></footer>
  </main>;
}
