'use client';
import { useCallback, useEffect, useState } from 'react';
import { call, useStore } from '../store';
const money = (n: number) => 'KSh ' + (n || 0).toLocaleString('en-KE');
// Financing partner portal: pay-later applications whose customers agreed to share their details.
export default function Partner() {
  const { token, setPanel, toast } = useStore();
  const [list, setList] = useState<any[] | null>(null), [err, setErr] = useState(''), [tab, setTab] = useState('Waiting');
  const load = useCallback(() => { call('/partner/applications', 'GET', undefined, token).then(setList).catch(e => setErr(e.message)); }, [token]);
  useEffect(() => { if (token) load(); }, [token, load]);
  if (!token) return <main className="wrap"><div className="empty">Sign in with your partner account.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  if (err) return <main className="wrap"><div className="empty">{/forbidden|unauthori/i.test(err) ? 'This page is for approved financing partner staff only.' : 'Could not load applications.'}<br /><small>{err}</small></div></main>;
  const act = async (id: string, kind: 'approve' | 'decline') => {
    let body: any;
    if (kind === 'approve') { const ref = window.prompt('Your approval reference (optional):'); if (ref === null) return; body = { reference: ref }; }
    else if (!window.confirm('Decline this application? The customer’s deposit will be refunded.')) return;
    try { await call(`/partner/applications/${id}/${kind}`, 'PATCH', body, token); toast(kind === 'approve' ? 'Approved ✔ Omora will release the order' : 'Declined'); load(); } catch (e: any) { toast(e.message); }
  };
  const waiting = (list || []).filter(a => a.status === 'AWAITING_APPROVAL'), decided = (list || []).filter(a => a.status !== 'AWAITING_APPROVAL'), shown = tab === 'Waiting' ? waiting : decided;
  return (<main className="wrap"><div className="h"><h2>Financing partner portal</h2><div className="tabs">{['Waiting', 'Decided'].map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}{t === 'Waiting' && waiting.length ? ` (${waiting.length})` : ''}</button>)}</div></div>
    <p className="addr fin" style={{ marginBottom: 14 }}>Customers here paid their deposit to Omora and agreed to share these details with you. Please use them only to assess the application. Documents you request from customers should be sent to you directly.</p>
    {list && !shown.length && <div className="empty">{tab === 'Waiting' ? 'No applications are waiting for a decision.' : 'No decided applications yet.'}</div>}
    <div className="olist">{shown.map(a => (
      <article className="order" key={a.id}>
        <div className="ohead"><div><b>Order #{a.ref}</b><small>{new Date(a.createdAt).toLocaleString('en-KE')}</small></div><span className={'chip ' + (a.status === 'AWAITING_APPROVAL' ? 'awaiting_financing' : a.status === 'DECLINED' ? 'cancelled' : 'delivered')}>{a.status === 'AWAITING_APPROVAL' ? 'Waiting' : a.status.toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}</span></div>
        <p className="addr">👤 {a.customerName} · {a.customerPhone}{a.customerEmail ? ' · ' + a.customerEmail : ''}<br />📍 {a.area}<br />Agreed to share details: {new Date(a.consentAt).toLocaleString('en-KE')}</p>
        {a.items.map((i: any, k: number) => <div className="oline" key={k}><div><b>{i.name}</b><small>{i.quantity} × {money(i.price)}</small></div></div>)}
        <p className="addr fin">Goods {money(a.goodsTotal)} · deposit paid {money(a.deposit)} (includes delivery) · <b>to be financed {money(a.financeAmount)}</b>{a.reference ? ' · your ref ' + a.reference : ''}</p>
        {a.status === 'AWAITING_APPROVAL' && <div className="acts" style={{ marginTop: 8 }}><button className="btn sm" onClick={() => act(a.id, 'approve')}>Approve</button><button className="btn sm o2" onClick={() => act(a.id, 'decline')}>Decline</button></div>}
      </article>))}</div></main>);
}
