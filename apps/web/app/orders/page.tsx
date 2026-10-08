'use client';
import { useEffect, useState } from 'react';
import { call, useStore } from '../store';
function Rate({ productId, orderId }: { productId: string; orderId: string }) {
  const { token, toast } = useStore(); const [r, setR] = useState(0), [c, setC] = useState(''), [done, setDone] = useState(false);
  if (done) return <small>Thanks for your review ✔</small>;
  const send = async () => { try { await call('/reviews', 'POST', { productId, orderId, rating: r, comment: c || undefined }, token); setDone(true); } catch (e: any) { toast(e.message); } };
  return <div className="rate">{[1, 2, 3, 4, 5].map(n => <button key={n} className={n <= r ? 'on' : ''} onClick={() => setR(n)} aria-label={n + ' stars'}>★</button>)}
    <input value={c} onChange={e => setC(e.target.value)} placeholder="Write a short review (optional)" /><button className="btn sm" disabled={!r} onClick={send}>Submit</button></div>;
}
const money = (n: number) => 'KSh ' + n.toLocaleString('en-KE');
const label = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
function Actions({ o, reload }: { o: any; reload: () => void }) {
  const { token, toast } = useStore(); const st: string[] = o.items.map((i: any) => i.status);
  const can = st.every(s => ['PENDING_PAYMENT', 'PAID', 'SELLER_CONFIRMED'].includes(s)), del = st.includes('DELIVERED') && !['REFUND_REQUESTED', 'REFUNDED'].includes(o.status);
  const run = async (path: string, body: unknown, msg: string) => { try { await call(path, 'POST', body, token); toast(msg); reload(); } catch (e: any) { toast(e.message); } };
  const pay = async () => {
    let phone = localStorage.getItem('omora-phone') || '';
    if (!phone) { phone = (window.prompt('Enter your M-Pesa phone number (format +2547XXXXXXXX)') || '').trim(); if (!phone) return; localStorage.setItem('omora-phone', phone); }
    try {
      await call('/payments/initiate', 'POST', { orderId: o.id, phone }, token); toast('Enter your M-Pesa PIN on your phone');
      for (let i = 0; i < 12; i++) {
        if (i) await new Promise(r => setTimeout(r, 5000));
        const v = await call('/payments/verify/' + o.id, 'POST', undefined, token).catch(() => ({ paid: false })); if (v.paid) { toast('Payment confirmed ✔'); reload(); return; }
      }
    } catch (e: any) { toast(e.message); }
  };
  const check = async () => { try { const v = await call('/payments/verify/' + o.id, 'POST', undefined, token); toast(v.paid ? 'Payment confirmed ✔' : 'No payment received yet'); reload(); } catch (e: any) { toast(e.message); } };
  return <div className="acts" style={{ marginTop: 8, alignItems: 'center' }}>
    {o.status === 'PENDING_PAYMENT' && <><button className="btn sm" onClick={pay}>Pay with M-Pesa</button><button className="btn sm o2" onClick={check}>Check payment</button></>}
    {st.some(s => !['PENDING_PAYMENT', 'CANCELLED'].includes(s)) && <a className="btn sm" href={`/track/${o.id}`}>Track delivery</a>}
    {can && <button className="btn sm o2" onClick={() => confirm('Cancel this order?') && run(`/orders/${o.id}/cancel`, undefined, 'Order cancelled')}>Cancel order</button>}
    {del && <button className="btn sm o2" onClick={() => { const r = prompt('Why do you want a refund?'); if (r) run(`/orders/${o.id}/refund-request`, { reason: r }, 'Refund requested ✔'); }}>Request refund</button>}
    {['REFUND_REQUESTED', 'REFUNDED', 'CANCELLED'].includes(o.status) && <span className={'chip ' + o.status.toLowerCase()}>{label(o.status)}</span>}
  </div>;
}
export default function Orders() {
  const { token, setPanel } = useStore();
  const [orders, setOrders] = useState<any[] | null>(null), [err, setErr] = useState('');
  const reload = () => call('/orders', 'GET', undefined, token).then(setOrders).catch(e => setErr(e.message));
  useEffect(() => { if (token) reload(); }, [token]); // eslint-disable-line
  if (!token) return <main className="wrap"><div className="empty">Sign in to see your orders.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  return (<main className="wrap"><div className="h"><h2>My Orders</h2></div>
    {err && <p className="err">{err}</p>}
    {orders && !orders.length && <div className="empty">No orders yet.<br /><br /><a className="btn" href="/#products">Start shopping</a></div>}
    <div className="olist">{orders?.map(o => (
      <article className="order" key={o.id}>
        <div className="ohead"><div><b>Order #{o.id.slice(-8).toUpperCase()}</b><small>{new Date(o.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div><b className="ototal">{money(o.total)}</b></div>
        {o.items.map((i: any) => (
          <div className="oline" key={i.id}><span className="oe">{i.product.emoji}</span>
            <div><b>{i.product.name}</b><small>{i.quantity} × {money(i.price)} · Sold by {i.seller.storeName}</small>{i.status === 'DELIVERED' && <Rate productId={i.productId} orderId={o.id} />}</div>
            <span className={'chip ' + i.status.toLowerCase()}>{label(i.status)}</span></div>))}
        <Actions o={o} reload={reload} />
      </article>))}</div></main>);
}
