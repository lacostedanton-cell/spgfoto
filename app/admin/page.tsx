'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type AppUser = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: 'owner' | 'admin' | 'moderator' | 'user';
};

const roleNames: Record<AppUser['role'], string> = {
  owner: 'Главный администратор',
  admin: 'Администратор',
  moderator: 'Модератор',
  user: 'Пользователь',
};

export default function AdminUsersPage() {
  const [role, setRole] = useState('loading');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setRole('guest');
      setUsers([]);
      setLoading(false);
      return;
    }
    const { data: roleData, error: roleError } = await supabase.rpc('current_app_role');
    if (roleError) {
      setRole('setup');
      setMessage('Сначала выполни миграцию 202611090006_admin_roles_and_user_management.sql в Supabase.');
      setLoading(false);
      return;
    }
    setRole(String(roleData || 'user'));
    if (roleData === 'owner') {
      const { data, error } = await supabase.rpc('list_app_users');
      if (error) setMessage(error.message);
      else setUsers((data || []) as AppUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function changeRole(user: AppUser, nextRole: 'user' | 'admin' | 'moderator') {
    setBusy(user.user_id);
    setMessage('');
    const { error } = await supabase.rpc('set_app_user_role', {
      p_user_id: user.user_id,
      p_role: nextRole,
    });
    setMessage(error?.message || `Права пользователя ${user.email} обновлены.`);
    if (!error) await load();
    setBusy('');
  }

  const visibleUsers = users.filter(u =>
    (u.email || '').toLowerCase().includes(filter.toLowerCase()) ||
    roleNames[u.role].toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <main style={{minHeight:'100vh',background:'#f5f6f8',color:'#18202b',padding:'28px 18px'}}>
      <div style={{maxWidth:1050,margin:'0 auto'}}>
        <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap',marginBottom:30}}>
          <Link href="/" style={{fontSize:22,fontWeight:800,color:'#18202b',textDecoration:'none'}}>СПГ<span style={{color:'#e46b43'}}>foto</span></Link>
          <Link href="/" style={{color:'#42516a'}}>← На главную</Link>
        </header>
        <p style={{fontSize:12,letterSpacing:2,color:'#e46b43',fontWeight:700}}>ПАНЕЛЬ УПРАВЛЕНИЯ</p>
        <h1 style={{fontSize:'clamp(30px,5vw,46px)',margin:'8px 0'}}>Пользователи и роли</h1>
        <p style={{color:'#647084',lineHeight:1.6,maxWidth:720}}>Назначение прав доступа СПГfoto. Главный администратор управляет ролями, администраторы ведут справочники, модераторы проверяют фотографии.</p>

        {loading ? <p style={{padding:24}}>Загружаем данные…</p> : null}
        {!loading && role === 'guest' ? <section style={panel}><h2>Нужен вход</h2><p>Сначала войди в свой аккаунт на главной странице, затем открой этот раздел снова.</p><Link href="/" style={linkButton}>Перейти ко входу</Link></section> : null}
        {!loading && role === 'setup' ? <section style={panel}><h2>Нужно завершить настройку</h2><p>{message}</p></section> : null}
        {!loading && role !== 'owner' && role !== 'setup' && role !== 'guest' ? <section style={panel}><h2>Недостаточно прав</h2><p>Раздел назначения ролей доступен только главному администратору. Твоя роль: {roleNames[role as AppUser['role']] || role}.</p></section> : null}

        {!loading && role === 'owner' ? <>
          <section style={{...panel,display:'flex',gap:18,flexWrap:'wrap'}}>
            <div><b style={{fontSize:28}}>{users.length}</b><div style={muted}>Всего аккаунтов</div></div>
            <div><b style={{fontSize:28}}>{users.filter(u=>u.role==='admin').length}</b><div style={muted}>Администраторов</div></div>
            <div><b style={{fontSize:28}}>{users.filter(u=>u.role==='moderator').length}</b><div style={muted}>Модераторов</div></div>
          </section>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Найти по email или роли…" style={{...field,width:'100%',marginBottom:14}}/>
          <section style={{...panel,padding:0,overflow:'hidden'}}>
            {visibleUsers.map(user => <article key={user.user_id} style={{padding:18,borderBottom:'1px solid #e8ebef',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
              <div style={{minWidth:220,flex:1}}>
                <b>{user.email || 'Email не указан'}</b>
                <div style={muted}>Регистрация: {new Date(user.created_at).toLocaleDateString('ru-RU')} · Последний вход: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('ru-RU') : 'ещё не входил'}</div>
                <div style={{fontSize:13,marginTop:5,color:user.role==='owner'?'#b45309':'#536176'}}>{roleNames[user.role]}</div>
              </div>
              {user.role === 'owner' ? <b style={{color:'#b45309'}}>Защищённая учётная запись</b> : <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <select aria-label={`Роль для ${user.email}`} value={user.role} disabled={busy===user.user_id} onChange={e=>changeRole(user,e.target.value as 'user'|'admin'|'moderator')} style={{...field,minWidth:190}}>
                  <option value="user">Пользователь</option><option value="moderator">Модератор</option><option value="admin">Администратор</option>
                </select>
                {busy===user.user_id ? <span style={muted}>Сохраняем…</span> : null}
              </div>}
            </article>)}
            {!visibleUsers.length ? <p style={{padding:20,color:'#647084'}}>Пользователи не найдены.</p> : null}
          </section>
        </> : null}
        {message && role !== 'setup' ? <p role="status" style={{marginTop:16,color:'#334155'}}>{message}</p> : null}
        <footer style={{marginTop:35,color:'#8993a2',fontSize:12}}>СПГfoto · Управление доступом</footer>
      </div>
    </main>
  );
}

const panel: CSSProperties = {background:'#fff',border:'1px solid #e5e8ed',borderRadius:16,padding:22,margin:'18px 0'};
const muted: CSSProperties = {color:'#758094',fontSize:13,marginTop:6};
const field: CSSProperties = {border:'1px solid #d9dee7',borderRadius:9,padding:'11px 12px',background:'#fff',color:'#18202b'};
const linkButton: CSSProperties = {display:'inline-block',background:'#18202b',color:'#fff',padding:'11px 16px',borderRadius:9,textDecoration:'none'};
