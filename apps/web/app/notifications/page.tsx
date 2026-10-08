'use client';
import { useEffect, useState } from 'react';
import { call, useStore } from '../store';
export default function Notifications() {
  const { token, setPanel, setUnread } = useStore();
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => { if (!token) return;
    call('/notifications', 'GET', undefined, token).then(async r => { setList(r.items); if (r.unread) { await call('/notifications/read-all', 'POST', undefined, token).catch(() => {}); setUnread(0); } }).catch(() => setList([])); }, [token]); // eslint-disable-line
  if (!token) return <main className="wrap"><div className="empty">Sign in to see your notifications.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  return (<main className="wrap"><div className="h"><h2>Notifications</h2></div>
    {list && !list.length && <div className="empty">🔔<br />You’re all caught up.</div>}
    <div className="olist">{list?.map(n => (
      <a key={n.id} className={'order note' + (n.read ? '' : ' new')} href={n.link || '#'}><b>{n.title}</b><small>{n.body}</small><small>{new Date(n.createdAt).toLocaleString('en-KE')}</small></a>))}</div></main>);
}
