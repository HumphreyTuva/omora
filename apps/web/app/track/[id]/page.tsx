'use client';
import { useEffect, useState } from 'react';
import { call, useStore } from '../../store';
const STEPS = ['Order placed', 'Paid', 'Ready for pickup', 'Picked up', 'In transit', 'Out for delivery', 'Delivered'];
const IDX: Record<string, number> = { PENDING_PAYMENT: 0, PAID: 1, SELLER_CONFIRMED: 1, PROCESSING: 1, READY_FOR_PICKUP: 2, PICKED_UP: 3, IN_TRANSIT: 4, OUT_FOR_DELIVERY: 5, DELIVERED: 6 };
export default function Track({ params }: { params: { id: string } }) {
  const { token, setPanel } = useStore();
  const [o, setO] = useState<any>(null), [err, setErr] = useState('');
  useEffect(() => { if (token) call('/logistics/track/' + params.id, 'GET', undefined, token).then(setO).catch(e => setErr(e.message)); }, [token, params.id]);
  if (!token) return <main className="wrap"><div className="empty">Sign in to track your order.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  if (err) return <main className="wrap"><div className="empty">{err}<br /><br /><a className="btn" href="/orders">Back to orders</a></div></main>;
  if (!o) return <main className="wrap"><div className="empty">Loading…</div></main>;
  const live = o.items.filter((i: any) => !['CANCELLED', 'REFUNDED'].includes(i.status));
  const cur = live.length ? Math.min(...live.map((i: any) => IDX[i.status] ?? 0)) : -1;
  return (<main className="wrap"><a className="back" href="/orders">‹ My orders</a><div className="h"><h2>Order #{o.id.slice(-8).toUpperCase()}</h2></div>
    {o.deliveryAddress && <p className="addr" style={{ marginBottom: 14 }}>📍 Delivering to {o.deliveryName} · {o.deliveryPhone}<br />{o.deliveryAddress}, {o.deliveryArea}{o.deliveryNotes ? ` (${o.deliveryNotes})` : ''}</p>}
    {cur < 0 ? <div className="empty">This order was cancelled or refunded.</div> : <ol className="steps">{STEPS.map((s, i) => <li key={s} className={i < cur ? 'done' : i === cur ? 'now' : ''}><span>{i <= cur ? '✓' : i + 1}</span>{s}</li>)}</ol>}
    {o.shipments.map((s: any) => <section className="reviews" key={s.id}><h2>Shipment {s.trackingNumber}</h2>
      {s.events.map((e: any) => <div className="rv" key={e.id}><b style={{ color: 'inherit' }}>{e.status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}</b><small>{new Date(e.createdAt).toLocaleString('en-KE')}</small>{e.note && <p>{e.note}</p>}</div>)}</section>)}
  </main>);
}
