'use client';
import Link from 'next/link';
export default function SiteNav(){return <header className="spgNav"><Link className="spgBrand" href="/">СПГ<span>foto</span></Link><nav><Link href="/encyclopedia">Энциклопедия</Link><Link href="/depots">Депо</Link><Link href="/models">Модели</Link><Link href="/routes">Маршруты</Link><Link href="/photographers">Фотографы</Link><Link href="/community">Сообщество</Link><Link href="/favorites">Избранное</Link></nav><Link className="spgNavAction" href="/#gallery">Фотогалерея</Link></header>;}
