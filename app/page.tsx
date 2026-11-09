'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Photo = { id:string; status:'pending'|'approved'|'rejected'; title:string; category:string; city:string|null; depot:string|null; vehicle_status:string|null; vehicle_purpose:string|null; vehicle_extra_status:string|null; vehicle_model:string|null; vehicle_number:string|null; photographer:string|null; shot_date:string|null; description:string|null; image_url:string; created_at:string; user_id:string };
const categories = ['Все','Трамваи','Автобусы','Троллейбусы','Метро','Поезда','Электрички','Корабли','Самолёты','Другое'];
const vehicleStatusColors:Record<string,string>={'Работает':'#FFFFFF','Не работает':'#F5D547','Новый / не был в эксплуатации в этом городе':'#39B96B','Выведен из эксплуатации':'#A0A4AA','Памятник/тренажёр':'#F28C32','Списан':'#D94343'};
export default function Home() {
  const [photos,setPhotos] = useState<Photo[]>([]);
  const [myPhotos,setMyPhotos] = useState<Photo[]>([]);
  const [user,setUser] = useState<any>(null);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [active,setActive] = useState('Все');
  const [uploadCategory,setUploadCategory] = useState('Трамваи');
  const [cityFilter,setCityFilter] = useState('');
  const [query,setQuery] = useState('');
  const [message,setMessage] = useState('');
  const [showUpload,setShowUpload] = useState(false);
  const [showLogin,setShowLogin] = useState(false);
  const [pending,setPending] = useState<Photo[]>([]);
  const [depots,setDepots] = useState<{name:string;city:string|null;country:string|null;transport_type:string|null}[]>([]);
  const [newDepot,setNewDepot] = useState({name:'',city:'',country:'',transport_type:'Метро'});
  const [isAdmin,setIsAdmin] = useState(false);
  const [canModerate,setCanModerate] = useState(false);

  async function load() {
    const {data} = await supabase.from('photos').select('*').eq('status','approved').order('created_at',{ascending:false});
    setPhotos((data || []) as Photo[]);
    const {data:depotData} = await supabase.from('depots').select('name,city,country,transport_type').order('name');
    setDepots((depotData || []) as {name:string;city:string|null;country:string|null;transport_type:string|null}[]);
    if (user) {
      const {data:mine,error:mineError} = await supabase.from('photos').select('*').eq('user_id',user.id).order('created_at',{ascending:false});
      if (!mineError) setMyPhotos((mine || []) as Photo[]);
      else console.error('Не удалось загрузить мои фотографии:', mineError.message);
    } else setMyPhotos([]);
    if (user && canModerate) {
      const {data:p} = await supabase.from('photos').select('*').eq('status','pending').order('created_at',{ascending:false});
      setPending((p || []) as Photo[]);
    }
  }
  useEffect(() => {
    supabase.auth.getUser().then(({data}) => setUser(data.user));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  },[]);
  useEffect(() => {
    let active = true;
    if (!user) { setIsAdmin(false); setCanModerate(false); return; }
    supabase.rpc('current_app_role').then(({data,error}) => {
      if (active) { setIsAdmin(!error && (data === 'owner' || data === 'admin')); setCanModerate(!error && ['owner','admin','moderator'].includes(String(data))); }
    });
    return () => { active = false; };
  },[user]);
  useEffect(() => { load(); },[user,isAdmin,canModerate]);
  const cities = useMemo(() => Array.from(new Set(photos.map(p => p.city?.trim()).filter((city): city is string => !!city))).sort((a,b)=>a.localeCompare(b,'ru')),[photos]);
  const shown = useMemo(() => photos.filter(p => (active==='Все'||p.category===active) && (!cityFilter || p.city?.trim()===cityFilter) && [p.city,p.vehicle_model,p.vehicle_number,p.description].join(' ').toLowerCase().includes(query.toLowerCase())),[photos,active,cityFilter,query]);
  async function signIn(e:React.FormEvent) { e.preventDefault(); setMessage(''); const {error} = await supabase.auth.signInWithPassword({email,password}); setMessage(error?.message || 'Вход выполнен'); }
  async function signUp() { setMessage(''); const {error} = await supabase.auth.signUp({email,password}); setMessage(error?.message || 'Проверь почту для подтверждения регистрации'); }
  async function resetPassword() { if(!email){setMessage('Сначала введи адрес электронной почты');return;} const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin}); setMessage(error?.message || 'Ссылка для сброса пароля отправлена на почту'); }
  async function upload(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!user) {setShowLogin(true); return;}
    const formElement = e.currentTarget;
    const form = new FormData(formElement); const file = form.get('image') as File;
    if(!file || !file.size) {setMessage('Выбери фотографию');return;}
    if(file.size > 12*1024*1024) {setMessage('Файл больше 12 МБ');return;}
    const ext = file.name.split('.').pop() || 'jpg'; const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const {error:upErr} = await supabase.storage.from('photos').upload(path,file,{upsert:false});
    if(upErr) {setMessage(upErr.message);return;}
    const {data:publicData} = supabase.storage.from('photos').getPublicUrl(path);
    const photoId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const photoRecord = {
      id:photoId, user_id:user.id,
      title:[String(form.get('model')||'').trim(), String(form.get('number')||'').trim() ? `№ ${String(form.get('number')).trim()}` : '', String(form.get('city')||'').trim()].filter(Boolean).join(' · ') || String(form.get('category')) + ' · ' + new Date().toLocaleDateString('ru-RU'),
      category:String(form.get('category')), city:String(form.get('city')||''), depot:String(form.get('depot')||'')||null,
      vehicle_purpose:String(form.get('vehicle_purpose')||'Пассажирский'), vehicle_status:String(form.get('vehicle_status')||'Работает'),
      vehicle_extra_status:String(form.get('vehicle_extra_status')||'')||null, vehicle_model:String(form.get('model')||''),
      vehicle_number:String(form.get('number')||''), photographer:String(form.get('photographer')||user.email?.split('@')[0]||'').trim(),
      shot_date:String(form.get('shot_date')||'')||null, description:String(form.get('description')||''),
      image_url:publicData.publicUrl, storage_path:path, status:'pending' as const, created_at:createdAt
    };
    const {error} = await supabase.from('photos').insert(photoRecord);
    if (error) {
      await supabase.storage.from('photos').remove([path]);
      setMessage('Не удалось сохранить фото: ' + error.message);
      return;
    }
    // Сразу показываем отправленную фотографию автору и в очереди модерации,
    // не дожидаясь повторного запроса к базе.
    setMyPhotos(current => [photoRecord as Photo, ...current.filter(item => item.id !== photoId)]);
    if (canModerate) setPending(current => [photoRecord as Photo, ...current.filter(item => item.id !== photoId)]);
    setMessage('Фото отправлено на модерацию. Оно появилось в «Моих фотографиях» и очереди проверки.');
    setShowUpload(false);
    formElement.reset();
    await load();
  }
  async function moderate(id:string,status:'approved'|'rejected') { const {error}=await supabase.from('photos').update({status}).eq('id',id); setMessage(error?.message || 'Статус обновлён'); load(); }
  async function logout(){await supabase.auth.signOut();setMessage('Вы вышли из аккаунта');}
  async function addDepot(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!isAdmin)return;const {error}=await supabase.from('depots').insert({name:newDepot.name.trim(),city:newDepot.city.trim()||null,country:newDepot.country.trim()||null,transport_type:newDepot.transport_type});setMessage(error?.message||'Депо добавлено в справочник');if(!error){setNewDepot({name:'',city:'',country:'',transport_type:'Метро'});load();}}
  return <main>
    <header className="top"><a className="brand" href="#">СПГ<span>foto</span></a><nav><a href="#gallery">Фотографии</a>{user&&<a href="#my-photos">Мои фото</a>}<a href="#categories">Категории</a><a href="#geography">Города</a><a href="/depots">Депо</a><a href="/encyclopedia">Энциклопедия</a><a href="/models">Модели</a><a href="/routes">Маршруты</a><a href="/photographers">Фотографы</a><a href="/community">Сообщество</a><a href="/favorites">Избранное</a>{isAdmin&&<a href="/admin">Администрирование</a>}<a href="#about">О проекте</a></nav><div className="headActions">{user?<><span className="userEmail">{user.email}</span><button className="ghost" onClick={logout}>Выйти</button></>:<button className="ghost" onClick={()=>setShowLogin(true)}>Войти</button>}<button onClick={()=>setShowUpload(true)}>＋ Добавить фото</button></div></header>
    <section className="hero"><div className="heroText"><p className="eyebrow">НЕЗАВИСИМАЯ ФОТОБАЗА ТРАНСПОРТА</p><h1>Транспорт<br/><em>в каждом кадре.</em></h1><p className="sub">Фотографии транспорта от сообщества. От городских маршрутов до поездов и кораблей.</p><div className="heroBtns"><a className="primary" href="#gallery">Смотреть фотографии</a><button className="light" onClick={()=>setShowUpload(true)}>Загрузить снимок</button></div></div><div className="heroArt"><div className="artLabel">COMMUNITY PHOTO ARCHIVE<br/><b>СПГfoto / 2026</b></div><div className="artCircle">СПГ<br/>foto</div><div className="artBottom">ТРАМВАИ · ПОЕЗДА · КОРАБЛИ</div></div></section>
    <section id="categories" className="section"><div className="sectionHead"><div><p className="eyebrow">ИССЛЕДУЙТЕ</p><h2>Весь транспорт</h2></div><span className="muted">Каталог направлений</span></div><div className="chips">{categories.map(c=><button key={c} className={active===c?'chip active':'chip'} onClick={()=>setActive(c)}>{c}</button>)}</div></section>
    <section id="geography" className="section"><div className="sectionHead"><div><p className="eyebrow">ГЕОГРАФИЯ ФОТОБАЗЫ</p><h2>Города и страны</h2></div><span className="muted">{cities.length} мест в каталоге</span></div><p className="muted" style={{marginBottom:18}}>География пополняется автоматически из мест съёмки опубликованных фотографий. Указывай город и страну при загрузке, например: «Берлин, Германия».</p><div className="chips"><button className={!cityFilter?"chip active":"chip"} onClick={()=>setCityFilter("")}>Все места</button>{cities.map(city=><button key={city} className={cityFilter===city?"chip active":"chip"} onClick={()=>{setCityFilter(city);document.getElementById("gallery")?.scrollIntoView({behavior:"smooth"});}}>{city}</button>)}</div></section>
    {user&&<section id="my-photos" className="section"><div className="sectionHead"><div><p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p><h2>Мои фотографии</h2></div><span className="count">{myPhotos.length} фото</span></div>{myPhotos.length?<div className="grid">{myPhotos.map(p=><article className="photo" key={p.id}><img src={p.image_url} alt={[p.vehicle_model,p.vehicle_number].filter(Boolean).join(' ') || 'Фотография транспорта'}/><a className="photoDetailLink" href={'/photos/'+p.id}>Открыть карточку фотографии →</a><div className="photoInfo"><span className="tag">{p.status==='pending'?'На модерации':p.status==='approved'?'Опубликовано':'Отклонено'}</span><h3>{[p.vehicle_model,p.vehicle_number?`№ ${p.vehicle_number}`:null].filter(Boolean).join(' · ') || p.category}</h3><p>{[p.city,p.depot].filter(Boolean).join(' · ') || 'Место съёмки не указано'}</p><small>Автор: {p.photographer || 'Не указан'}</small><small>Съёмка: {p.shot_date || 'Дата не указана'}</small><small>Отправлено: {new Date(p.created_at).toLocaleDateString('ru-RU')}</small>{p.status==='rejected'&&<small>Фото не прошло модерацию</small>}</div></article>)}</div>:<div className="empty"><b>Ты ещё не отправлял фотографии.</b><p>Загруженные снимки и их статусы будут отображаться здесь.</p><button onClick={()=>setShowUpload(true)}>Добавить фотографию</button></div>}</section>}
    <section id="gallery" className="section gallerySection"><div className="sectionHead"><div><p className="eyebrow">СООБЩЕСТВО</p><h2>Фотогалерея</h2></div><span className="count">{shown.length} фото</span></div><div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по модели, номеру, городу..."/></div>{shown.length?<div className="grid">{shown.map(p=><article className="photo" key={p.id}><img src={p.image_url} alt={[p.vehicle_model,p.vehicle_number].filter(Boolean).join(' ') || 'Фотография транспорта'}/><div className="photoInfo"><span className="tag">{p.category}</span><h3>{[p.vehicle_model,p.vehicle_number?`№ ${p.vehicle_number}`:null].filter(Boolean).join(' · ') || p.category}</h3><p>{[p.vehicle_model,p.vehicle_number,p.city,p.depot].filter(Boolean).join(' · ')}</p><small>Назначение: {p.vehicle_purpose || 'Не указано'}</small><small className="photoVehicleStatus">Текущее состояние: <i style={{display:'inline-block',width:12,height:12,margin:'0 5px -1px',background:vehicleStatusColors[p.vehicle_status||'']||'#D9E0E7',border:vehicleStatusColors[p.vehicle_status||'']==='#FFFFFF'?'1px solid #999':'1px solid transparent'}} aria-hidden="true"/>{p.vehicle_status || 'Не указано'}{p.vehicle_extra_status ? ` · ${p.vehicle_extra_status}` : ''}</small><small>Автор: {p.photographer || 'Не указан'}</small><small>{p.shot_date || new Date(p.created_at).toLocaleDateString('ru-RU')}</small></div></article>)}</div>:<div className="empty"><b>Пока здесь тихо.</b><p>Добавь первую фотографию в эту фотобазу.</p><button onClick={()=>setShowUpload(true)}>Загрузить фотографию</button></div>}</section>
    <section id="depots" className="section"><div className="sectionHead"><div><p className="eyebrow">СПРАВОЧНИК</p><h2>Депо</h2></div><span className="muted">{depots.length} депо · <a href="/depots">Открыть полный справочник →</a></span></div>{depots.length?<div className="chips">{depots.map((d,i)=><span className="chip" key={`${d.name}-${i}`}>{d.name}{d.city?` · ${d.city}`:''}{d.country?`, ${d.country}`:''}{d.transport_type?` — ${d.transport_type}`:''}</span>)}</div>:<p className="muted">Депо пока не добавлены. Администратор может создать первое.</p>}</section>
    {canModerate&&<section className="section admin"><div className="sectionHead"><div><p className="eyebrow">УПРАВЛЕНИЕ</p><h2>Модерация</h2></div><span className="count">{pending.length} на проверке</span></div>{pending.length?pending.map(p=><div className="pending" key={p.id}><img src={p.image_url}/><div><b>{[p.vehicle_model,p.vehicle_number?`№ ${p.vehicle_number}`:null].filter(Boolean).join(' · ') || p.category}</b><p>{[p.category,p.city,p.depot,p.photographer,p.vehicle_status,p.shot_date].filter(Boolean).join(' · ')}</p></div><button onClick={()=>moderate(p.id,'approved')}>Одобрить</button><button className="danger" onClick={()=>moderate(p.id,'rejected')}>Отклонить</button></div>):<p className="muted">Новых фотографий на проверке нет.</p>}</section>}
    {isAdmin&&<section className="section admin"><div className="sectionHead"><div><p className="eyebrow">СПРАВОЧНИКИ</p><h2>Добавить депо</h2></div></div><form className="depotForm" onSubmit={addDepot}><input placeholder="Название депо" value={newDepot.name} onChange={e=>setNewDepot({...newDepot,name:e.target.value})} required/><input placeholder="Город" value={newDepot.city} onChange={e=>setNewDepot({...newDepot,city:e.target.value})}/><input placeholder="Страна" value={newDepot.country} onChange={e=>setNewDepot({...newDepot,country:e.target.value})}/><select value={newDepot.transport_type} onChange={e=>setNewDepot({...newDepot,transport_type:e.target.value})}><option>Метро</option><option>Трамвай</option><option>Автобус</option><option>Троллейбус</option><option>Железная дорога</option><option>Другое</option></select><button>Добавить депо</button></form></section>}
    <footer id="about"><div className="brand">СПГ<span>foto</span></div><p>Фотобаза транспорта, созданная сообществом.</p><small>© 2026 СПГfoto · Полностью вымышленный фотопроект: все фотографии, транспортные средства, города, страны, депо, маршруты и сведения придуманы и не относятся к реальным объектам или событиям. Любые совпадения случайны.</small></footer>
    {message&&<div className="toast" onClick={()=>setMessage('')}>{message} ×</div>}
    {showLogin&&<div className="overlay" onClick={()=>setShowLogin(false)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowLogin(false)}>×</button><p className="eyebrow">АККАУНТ</p><h2>Войти или зарегистрироваться</h2><form onSubmit={signIn}><input type="email" placeholder="Электронная почта" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Пароль (минимум 6 символов)" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/><button className="wide">Войти</button></form><button className="linkBtn" onClick={signUp}>Создать аккаунт</button><button className="linkBtn" onClick={resetPassword}>Забыли пароль?</button><p className="muted">{message}</p></div></div>}
    {showUpload&&<div className="overlay" onClick={()=>setShowUpload(false)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowUpload(false)}>×</button><p className="eyebrow">В ФОТОБАЗУ</p><h2>Добавить фотографию</h2><form onSubmit={upload}><select name="category" value={uploadCategory} onChange={e=>setUploadCategory(e.target.value)}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select><div className="two"><input name="model" placeholder="Модель транспорта"/><input name="number" placeholder="Бортовой / заводской №"/></div><input name="city" placeholder="Вымышленный город, страна"/><input name="photographer" placeholder="Автор снимка (фотограф)" defaultValue={user?.email?.split('@')[0] || ''}/><select name="depot"><option value="">Депо не указано</option>{depots.map((d,i)=><option key={`${d.name}-${i}`} value={d.name}>{d.name}{d.city?` · ${d.city}`:''}</option>)}</select><label className="fieldLabel">Назначение ТС<select name="vehicle_purpose" defaultValue="Пассажирский"><option>Пассажирский</option><option>Служебный</option></select></label>{uploadCategory==='Электрички'&&<label className="fieldLabel">Дополнительное состояние электрички<select name="vehicle_extra_status" defaultValue=""><option value="">Не указано</option><option>Расформирован</option></select></label>}<label className="fieldLabel">Текущее состояние ТС<select name="vehicle_status" defaultValue="Работает"><option>Работает</option><option>Не работает</option><option>Новый / не был в эксплуатации в этом городе</option><option>Выведен из эксплуатации</option><option>Памятник/тренажёр</option><option>Списан</option></select></label><input name="shot_date" type="date"/><textarea name="description" placeholder="Описание (необязательно)"/><input name="image" type="file" accept="image/*" required/><button className="wide">Отправить на модерацию</button></form><p className="muted">Фотографии публикуются после проверки модератором.</p></div></div>}
  </main>;
      }
