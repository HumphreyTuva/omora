'use client';
import ProductImage from '../ProductImage';
import { useCallback, useEffect, useState } from 'react';
import { call, useStore } from '../store';
const money = (n: number) => 'KSh ' + (n || 0).toLocaleString('en-KE');
const label = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
function Row({ c, save }: { c: any; save: (id: string, rate: number) => void }) {
  const [v, setV] = useState(String(Math.round(c.commissionRate * 1000) / 10));
  return <article className="order"><div className="oline"><div><b>{c.name}</b><small>Charged on every new sale in this category</small></div>
    <input className="pct" type="number" min={0} max={50} step={0.5} value={v} onChange={e => setV(e.target.value)} aria-label={c.name + ' commission percent'} /><b>%</b>
    <button className="btn sm" style={{ margin: 0 }} onClick={() => save(c.id, +v / 100)}>Save</button></div></article>;
}
function SettingsTab({ token, toast }: any) {
  const [f, setF] = useState({ deliveryFee: '', freeAbove: '' });
  useEffect(() => { call('/admin/settings', 'GET', undefined, token).then(r => setF({ deliveryFee: String(r.deliveryFee), freeAbove: String(r.freeAbove) })).catch(() => {}); }, [token]);
  const save = async (e: React.FormEvent) => { e.preventDefault(); try { await call('/admin/settings', 'PATCH', { deliveryFee: +f.deliveryFee, freeAbove: +f.freeAbove }, token); toast('Delivery settings saved ✔'); } catch (x: any) { toast(x.message); } };
  return <form className="sform" style={{ maxWidth: 460 }} onSubmit={save}><h3>Delivery</h3>
    <label>Delivery fee (KSh)<input required type="number" min={0} value={f.deliveryFee} onChange={e => setF({ ...f, deliveryFee: e.target.value })} /></label>
    <label>Free delivery for orders above (KSh)<input required type="number" min={0} value={f.freeAbove} onChange={e => setF({ ...f, freeAbove: e.target.value })} /></label>
    <small>Applies to new orders only. Enter 0 in the second box to charge delivery on every order.</small><button className="btn">Save</button></form>;
}
function CouponsTab({ list, token, toast, reload }: any) {
  const blank = { code: '', kind: 'percent', value: '', minSpend: '', maxUses: '', days: '' }, [f, setF] = useState(blank);
  const create = async (e: React.FormEvent) => { e.preventDefault(); try { await call('/admin/coupons', 'POST', { code: f.code, [f.kind === 'percent' ? 'percentOff' : 'amountOff']: +f.value, minSpend: f.minSpend, maxUses: f.maxUses, days: f.days }, token); toast('Coupon created ✔'); setF(blank); reload(); } catch (x: any) { toast(x.message); } };
  const toggle = async (id: string) => { try { await call(`/admin/coupons/${id}/toggle`, 'PATCH', undefined, token); reload(); } catch (x: any) { toast(x.message); } };
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return <div className="pd2"><form className="sform" onSubmit={create}><h3>New coupon</h3>
    <label>Code<input required value={f.code} onChange={set('code')} placeholder="WELCOME10" /></label>
    <div className="two"><label>Type<select value={f.kind} onChange={set('kind')}><option value="percent">Percent off</option><option value="amount">KSh off</option></select></label><label>Value<input required type="number" min={1} value={f.value} onChange={set('value')} /></label></div>
    <div className="two"><label>Min spend (KSh)<input type="number" min={0} value={f.minSpend} onChange={set('minSpend')} /></label><label>Max uses<input type="number" min={1} value={f.maxUses} onChange={set('maxUses')} placeholder="Unlimited" /></label></div>
    <label>Valid for (days)<input type="number" min={1} value={f.days} onChange={set('days')} placeholder="No expiry" /></label><button className="btn">Create coupon</button></form>
    <div className="olist">{!list.length && <div className="empty">No coupons yet.</div>}{list.map((c: any) => <article className="order" key={c.id}><div className="oline"><span className="oe">🏷️</span>
      <div><b>{c.code} · {c.percentOff ? c.percentOff + '% off' : money(c.amountOff) + ' off'}</b><small>Used {c.used}{c.maxUses ? '/' + c.maxUses : ''} · min spend {money(c.minSpend)}{c.expiresAt ? ' · expires ' + new Date(c.expiresAt).toLocaleDateString('en-KE') : ''}</small></div>
      <button className={'btn sm ' + (c.active ? 'o2' : '')} style={{ margin: 0 }} onClick={() => toggle(c.id)}>{c.active ? 'Turn off' : 'Turn on'}</button></div></article>)}</div></div>;
}
const addr = (o: any) => o?.deliveryAddress ? `📍 ${o.deliveryName} · ${o.deliveryPhone} · ${o.deliveryAddress}, ${o.deliveryArea}${o.deliveryNotes ? ' (' + o.deliveryNotes + ')' : ''}` : '📍 No address (order placed before addresses were required)';
const STEP: Record<string, [string, string]> = { CREATED: ['PICKED_UP', 'Mark picked up'], PICKED_UP: ['IN_TRANSIT', 'Mark in transit'], IN_TRANSIT: ['OUT_FOR_DELIVERY', 'Out for delivery'], OUT_FOR_DELIVERY: ['DELIVERED', 'Mark delivered'] };
function LogisticsTab({ token, toast }: any) {
  const [ready, setReady] = useState<any[]>([]), [ships, setShips] = useState<any[]>([]);
  const reload = useCallback(() => { call('/logistics/ready', 'GET', undefined, token).then(setReady).catch(() => {}); call('/logistics/shipments', 'GET', undefined, token).then(setShips).catch(() => {}); }, [token]);
  useEffect(reload, [reload]);
  const run = async (path: string, method: string, body: unknown, msg: string) => { try { await call(path, method, body, token); toast(msg); reload(); } catch (x: any) { toast(x.message); } };
  return <div className="olist"><h3>Ready for pickup</h3>{!ready.length && <div className="empty">No orders waiting for a shipment.</div>}
    {ready.map(o => <article className="order" key={o.id}><div className="oline"><span className="oe">📦</span><div><b>#{o.id.slice(-8).toUpperCase()}</b><small>{o.customer.phone} · {o.items.length} item(s)</small><small>{addr(o)}</small></div>
      <button className="btn sm" style={{ margin: 0 }} onClick={() => run('/logistics/shipments', 'POST', { orderId: o.id }, 'Shipment created ✔')}>Create shipment</button></div></article>)}
    <h3 style={{ marginTop: 14 }}>Active shipments</h3>{!ships.length && <div className="empty">No active shipments.</div>}
    {ships.map(s => <article className="order" key={s.id}><div className="oline"><span className="oe">🚚</span><div><b>{s.trackingNumber}</b><small>Order #{s.orderId.slice(-8).toUpperCase()} · {label(s.status)}</small><small>{addr(s.order)}</small></div>
      {STEP[s.status] && <button className="btn sm" style={{ margin: 0 }} onClick={() => run(`/logistics/shipments/${s.id}`, 'PATCH', { status: STEP[s.status][0] }, 'Shipment updated ✔')}>{STEP[s.status][1]}</button>}</div></article>)}</div>;
}
export default function Admin() {
  const { token, setPanel, toast } = useStore();
  const [loadErr, setLoadErr] = useState('');
  const [tab, setTab] = useState('Sellers'), [o, setO] = useState<any>(null), [sellers, setSellers] = useState<any[]>([]), [prods, setProds] = useState<any[]>([]), [orders, setOrders] = useState<any[]>([]), [payouts, setPayouts] = useState<any[]>([]), [refunds, setRefunds] = useState<any[]>([]), [comm, setComm] = useState<any[]>([]), [coupons, setCoupons] = useState<any[]>([]), [denied, setDenied] = useState(false);
  const load = useCallback(async () => {
    try { const g = (p: string) => call(p, 'GET', undefined, token); const [a, b, c, d, p, rf, cm, cp] = await Promise.all([g('/admin/overview'), g('/admin/sellers'), g('/admin/products/pending'), g('/admin/orders'), g('/admin/payouts'), g('/admin/refunds'), g('/admin/commissions'), g('/admin/coupons')]); setCoupons(cp); setComm(cm); setRefunds(rf); setO(a); setSellers(b); setProds(c); setOrders(d); setPayouts(p); }
    catch (e: any) { if (/forbidden|unauthori[sz]ed/i.test(e.message || '')) setDenied(true); else setLoadErr(e.message || 'Something went wrong'); }
  }, [token]);
  useEffect(() => { if (token) load(); }, [token, load]);
  if (!token) return <main className="wrap"><div className="empty">Sign in with an admin phone number.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  if (denied) return <main className="wrap"><div className="empty">Admin access only. Sign in with an admin account.</div></main>;
  if (loadErr) return <main className="wrap"><div className="empty">Could not load the admin page.<br /><small>{loadErr}</small><br /><br /><button className="btn" onClick={() => { setLoadErr(''); load(); }}>Try again</button></div></main>;
  const checkPayment = async (id: string) => { try { const v = await call('/payments/admin-verify/' + id, 'POST', undefined, token); toast(v.paid ? 'Payment found, order marked paid ✔' : v.failed ? (v.reason || 'The payment failed') : 'No payment received yet'); load(); } catch (e: any) { toast(e.message); } };
  const act = async (path: string, msg: string, body?: unknown) => { try { await call(path, 'PATCH', body, token); toast(msg); load(); } catch (e: any) { toast(e.message); } };
  return (<main className="wrap"><div className="h"><h2>Omora Admin</h2>
    <div className="tabs">{['Sellers', 'Products', 'Orders', 'Refunds', 'Payouts', 'Commissions', 'Coupons', 'Logistics', 'Settings'].map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}{t === 'Sellers' && o?.pendingSellers ? ` (${o.pendingSellers})` : ''}{t === 'Refunds' && refunds.length ? ` (${refunds.length})` : ''}{t === 'Products' && o?.pendingProducts ? ` (${o.pendingProducts})` : ''}</button>)}</div></div>
    {o && <div className="stats" style={{ marginBottom: 18 }}>
      <div><small>Sales (GMV)</small><b>{money(o.gmv)}</b></div><div><small>Orders</small><b>{o.orders}</b></div><div><small>Customers</small><b>{o.customers}</b></div>
      <div><small>Sellers</small><b>{o.sellers}</b></div><div><small>Sellers awaiting review</small><b>{o.pendingSellers}</b></div><div><small>Products awaiting review</small><b>{o.pendingProducts}</b></div></div>}
    {tab === 'Sellers' && <div className="olist">{sellers.map(s => (
      <article className="order" key={s.id}><div className="oline"><span className="oe">🏪</span><div><b>{s.storeName}</b><small>{s.user.phone} · {s._count.products} products</small></div>
        <span className={'chip ' + (s.status === 'VERIFIED' ? 'delivered' : s.status === 'PENDING_VERIFICATION' ? 'paid' : 'cancelled')}>{label(s.status)}</span></div>
        <div className="acts">{s.status !== 'VERIFIED' && <button className="btn sm" onClick={() => act(`/admin/sellers/${s.id}/verify`, 'Seller verified ✔')}>Verify</button>}
          {s.status === 'PENDING_VERIFICATION' && <button className="btn sm o2" onClick={() => act(`/admin/sellers/${s.id}/reject`, 'Seller rejected')}>Reject</button>}
          {s.status === 'VERIFIED' && <button className="btn sm o2" onClick={() => act(`/admin/sellers/${s.id}/suspend`, 'Seller suspended')}>Suspend</button>}</div></article>))}</div>}
    {tab === 'Products' && <div className="olist">{!prods.length && <div className="empty">No products waiting for review. 🎉</div>}{prods.map(p => (
      <article className="order" key={p.id}><div className="oline"><span className="oe"><ProductImage src={p.images?.[0]?.url} emoji="📦" alt="" /></span><div><b>{p.name}</b><small>{p.seller.storeName} · {p.category.name} · {money(p.price)} · {p.stock} in stock</small></div></div>
        <div className="acts"><button className="btn sm" onClick={() => act(`/admin/products/${p.id}/approve`, 'Product is live ✔')}>Approve</button><button className="btn sm o2" onClick={() => act(`/admin/products/${p.id}/reject`, 'Product rejected')}>Reject</button></div></article>))}</div>}
    {tab === 'Orders' && <div className="olist">{!orders.length && <div className="empty">No orders yet.</div>}{orders.map(r => (
      <article className="order" key={r.id}><div className="ohead"><div><b>#{r.id.slice(-8).toUpperCase()}</b><small>{r.customer.phone} · {new Date(r.createdAt).toLocaleDateString('en-KE')} · {r.items.length} item(s)</small></div><b className="ototal">{money(r.total)}</b></div>
        <span className={'chip ' + r.status.toLowerCase()}>{label(r.status)}</span>{r.status === 'PENDING_PAYMENT' && <button className="btn sm" style={{ marginLeft: 10 }} onClick={() => checkPayment(r.id)}>Check payment</button>}</article>))}</div>}
    {tab === 'Refunds' && <div className="olist">{!refunds.length && <div className="empty">No refund requests.</div>}{refunds.map(r => (
      <article className="order" key={r.id}><div className="ohead"><div><b>#{r.id.slice(-8).toUpperCase()} · {r.customer.phone}</b><small>{r.refundReason ? 'Reason: ' + r.refundReason : 'Cancelled after payment'}</small></div><b className="ototal">{money(r.total)}</b></div>
        <div className="acts"><button className="btn sm" onClick={() => confirm('Approve only after you have sent the money back to the customer. Continue?') && act(`/admin/refunds/${r.id}/approve`, 'Marked as refunded ✔')}>Approve &amp; mark refunded</button>
          {r.items.some((i: any) => i.status === 'DELIVERED') && <button className="btn sm o2" onClick={() => act(`/admin/refunds/${r.id}/reject`, 'Refund rejected')}>Reject</button>}</div></article>))}</div>}
    {tab === 'Commissions' && <div className="olist">{comm.map(c => <Row key={c.id} c={c} save={(id, rate) => act(`/admin/commissions/${id}`, 'Commission updated ✔', { rate })} />)}</div>}
    {tab === 'Coupons' && <CouponsTab list={coupons} token={token} toast={toast} reload={load} />}
    {tab === 'Logistics' && <LogisticsTab token={token} toast={toast} />}
    {tab === 'Settings' && <SettingsTab token={token} toast={toast} />}
    {tab === 'Payouts' && <div className="olist">{!payouts.length && <div className="empty">No payout requests.</div>}{payouts.map(p => (
      <article className="order" key={p.id}><div className="oline"><span className="oe">💸</span><div><b>{p.seller.storeName} · {money(p.amount)}</b><small>Send to: {p.payoutName ? `${p.payoutName} · ${p.payoutMpesa}` : `${p.seller.user.phone || 'no payout details'} (requested before payout details were required)`}{p.reference ? ' · Ref ' + p.reference : ''}</small></div>
        <span className={'chip ' + (p.status === 'PAID' ? 'delivered' : 'paid')}>{label(p.status)}</span></div>
        {p.status === 'PENDING' && <div className="acts"><button className="btn sm" onClick={() => { const ref = window.prompt('M-Pesa reference after you send the money:'); if (ref) act(`/admin/payouts/${p.id}/paid`, 'Marked as paid ✔', { reference: ref }); }}>Mark as paid</button></div>}</article>))}</div>}
  </main>);
}
