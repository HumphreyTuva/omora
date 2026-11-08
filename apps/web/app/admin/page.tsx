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
  const [f, setF] = useState({ deliveryFee: '', freeAbove: '', enabled: false, depositPercent: '10', feePercent: '1', categories: 'electronics,computers' });
  useEffect(() => { call('/admin/settings', 'GET', undefined, token).then(r => setF({ deliveryFee: String(r.deliveryFee), freeAbove: String(r.freeAbove), enabled: !!r.financing?.enabled, depositPercent: String(r.financing?.depositPercent ?? 10), feePercent: String(r.financing?.feePercent ?? 1), categories: (r.financing?.categories || []).join(',') })).catch(() => {}); }, [token]);
  const save = async (e: React.FormEvent) => { e.preventDefault(); try { await call('/admin/settings', 'PATCH', { deliveryFee: +f.deliveryFee, freeAbove: +f.freeAbove, financingEnabled: f.enabled, depositPercent: +f.depositPercent, feePercent: +f.feePercent, financingCategories: f.categories }, token); toast('Settings saved ✔'); } catch (x: any) { toast(x.message); } };
  return <form className="sform" style={{ maxWidth: 460 }} onSubmit={save}><h3>Delivery</h3>
    <label>Delivery fee (KSh)<input required type="number" min={0} value={f.deliveryFee} onChange={e => setF({ ...f, deliveryFee: e.target.value })} /></label>
    <label>Free delivery for orders above (KSh)<input required type="number" min={0} value={f.freeAbove} onChange={e => setF({ ...f, freeAbove: e.target.value })} /></label>
    <small>Applies to new orders only. Enter 0 in the second box to charge delivery on every order.</small>
    <h3 style={{ marginTop: 10 }}>Pay later (Baadae)</h3>
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.enabled} onChange={e => setF({ ...f, enabled: e.target.checked })} /> Offer “Pay later with Baadae” at checkout</label>
    <div className="two"><label>Deposit (% of goods)<input required type="number" min={1} max={90} step="0.5" value={f.depositPercent} onChange={e => setF({ ...f, depositPercent: e.target.value })} /></label><label>Baadae fee (% of goods)<input required type="number" min={0} max={20} step="0.1" value={f.feePercent} onChange={e => setF({ ...f, feePercent: e.target.value })} /></label></div>
    <label>Eligible category slugs<input value={f.categories} onChange={e => setF({ ...f, categories: e.target.value })} placeholder="electronics,computers" /></label>
    <small>Keep this off until the signed agreement, Baadae’s licence and how approvals reach you are all confirmed. Customers only see the option when every item in their cart is in an eligible category.</small>
    <button className="btn">Save</button></form>;
}
function ApplicationsTab({ token, toast }: any) {
  const [list, setList] = useState<any[]>([]), [open, setOpen] = useState('');
  const load = useCallback(() => { call('/admin/applications', 'GET', undefined, token).then(setList).catch(() => {}); }, [token]);
  useEffect(load, [load]);
  const act = async (id: string, kind: 'approve' | 'reject') => {
    let body: any;
    if (kind === 'reject') { const note = window.prompt('Reason for rejecting (the seller will see this):'); if (note === null) return; body = { note }; }
    else if (!window.confirm('Approve this seller and countersign the agreement for Omora?')) return;
    try { await call(`/admin/applications/${id}/${kind}`, 'PATCH', body, token); toast(kind === 'approve' ? 'Approved and countersigned ✔' : 'Application rejected'); load(); } catch (e: any) { toast(e.message); }
  };
  return <div className="olist">{!list.length && <div className="empty">No seller applications yet.</div>}{list.map(a => (
    <article className="order" key={a.id}>
      <div className="ohead"><div><b>{a.seller.storeName}</b><small>{a.legalName} · {label(a.plan)} plan · agreement v{a.agreementVersion}</small></div><span className={'chip ' + (a.status === 'APPROVED' ? 'delivered' : a.status === 'REJECTED' ? 'cancelled' : 'paid')}>{label(a.status)}</span></div>
      <p className="addr">ID / registration: {a.idNumber} · KRA PIN: {a.kraPin}<br />{a.phone} · {a.email} · Contact: {a.contactPerson}<br />{a.address}, {a.county}<br />Sells: {a.categories}</p>
      <p className="addr fin">✍️ Signed by {a.signedName}, {a.signedTitle} on {new Date(a.signedAt).toLocaleString('en-KE')} · IP {a.signedIp || 'n/a'} · confirmed with a one-time code</p>
      {a.status === 'REJECTED' && a.reviewNote && <p className="addr">Rejection reason: {a.reviewNote}</p>}
      <div className="acts" style={{ marginTop: 8 }}>
        {a.status !== 'APPROVED' && <button className="btn sm" onClick={() => act(a.id, 'approve')}>Approve and countersign</button>}
        {a.status === 'SUBMITTED' && <button className="btn sm o2" onClick={() => act(a.id, 'reject')}>Reject</button>}
        <button className="btn sm o2" onClick={() => setOpen(open === a.id ? '' : a.id)}>{open === a.id ? 'Hide agreement' : 'View agreement'}</button></div>
      {open === a.id && <pre className="agree-box">{a.agreementText}</pre>}
    </article>))}</div>;
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
  const financeAction = async (id: string, kind: 'approve' | 'decline' | 'settled') => {
    let body: any;
    if (kind === 'approve') { const ref = window.prompt('Baadae approval reference (optional):'); if (ref === null) return; body = { reference: ref }; }
    if (kind === 'settled') { const ref = window.prompt('Reference of the payment you received from Baadae:'); if (!ref) return; body = { reference: ref }; }
    if (kind === 'decline' && !window.confirm('Decline this application? The deposit then has to be refunded to the customer (see the Refunds tab).')) return;
    try { await call(`/admin/financing/${id}/${kind}`, 'PATCH', body, token); toast(kind === 'approve' ? 'Financing approved ✔ The seller can now fulfil the order' : kind === 'decline' ? 'Declined. Refund the deposit in the Refunds tab' : 'Marked as paid by Baadae ✔'); load(); } catch (e: any) { toast(e.message); }
  };
  const act = async (path: string, msg: string, body?: unknown) => { try { await call(path, 'PATCH', body, token); toast(msg); load(); } catch (e: any) { toast(e.message); } };
  return (<main className="wrap"><div className="h"><h2>Omora Admin</h2>
    <div className="tabs">{['Sellers', 'Products', 'Orders', 'Refunds', 'Payouts', 'Commissions', 'Coupons', 'Logistics', 'Settings', 'Applications'].map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}{t === 'Sellers' && o?.pendingSellers ? ` (${o.pendingSellers})` : ''}{t === 'Refunds' && refunds.length ? ` (${refunds.length})` : ''}{t === 'Products' && o?.pendingProducts ? ` (${o.pendingProducts})` : ''}</button>)}</div></div>
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
        <span className={'chip ' + r.status.toLowerCase()}>{label(r.status)}</span>{r.status === 'PENDING_PAYMENT' && <button className="btn sm" style={{ marginLeft: 10 }} onClick={() => checkPayment(r.id)}>Check payment</button>}
        {r.financed && <p className="addr fin">🏦 Baadae pay later: deposit {money(r.depositAmount)} · financed {money(r.financeAmount)} · Baadae fee about {money(r.financeFee)} · {r.financeStatus || 'deposit not paid'}{r.financeRef ? ' · ref ' + r.financeRef : ''}{r.financeSettleRef ? ' · Baadae paid, ref ' + r.financeSettleRef : ''}</p>}
        {r.status === 'AWAITING_FINANCING' && <div className="acts" style={{ marginTop: 8 }}><button className="btn sm" onClick={() => financeAction(r.id, 'approve')}>Approve financing</button><button className="btn sm o2" onClick={() => financeAction(r.id, 'decline')}>Decline and refund deposit</button></div>}
        {r.financed && r.financeStatus === 'APPROVED' && <div className="acts" style={{ marginTop: 8 }}><button className="btn sm" onClick={() => financeAction(r.id, 'settled')}>Mark Baadae paid</button></div>}</article>))}</div>}
    {tab === 'Refunds' && <div className="olist">{!refunds.length && <div className="empty">No refund requests.</div>}{refunds.map(r => (
      <article className="order" key={r.id}><div className="ohead"><div><b>#{r.id.slice(-8).toUpperCase()} · {r.customer.phone}</b><small>{r.refundReason ? 'Reason: ' + r.refundReason : 'Cancelled after payment'}{r.financed ? ' · Pay-later order: refund only the deposit, and tell Baadae to reverse the financing' : ''}</small></div><b className="ototal">{money(r.total)}</b></div>
        <div className="acts"><button className="btn sm" onClick={() => confirm('Approve only after you have sent the money back to the customer. Continue?') && act(`/admin/refunds/${r.id}/approve`, 'Marked as refunded ✔')}>Approve &amp; mark refunded</button>
          {r.items.some((i: any) => i.status === 'DELIVERED') && <button className="btn sm o2" onClick={() => act(`/admin/refunds/${r.id}/reject`, 'Refund rejected')}>Reject</button>}</div></article>))}</div>}
    {tab === 'Commissions' && <div className="olist">{comm.map(c => <Row key={c.id} c={c} save={(id, rate) => act(`/admin/commissions/${id}`, 'Commission updated ✔', { rate })} />)}</div>}
    {tab === 'Coupons' && <CouponsTab list={coupons} token={token} toast={toast} reload={load} />}
    {tab === 'Logistics' && <LogisticsTab token={token} toast={toast} />}
    {tab === 'Settings' && <SettingsTab token={token} toast={toast} />}
    {tab === 'Applications' && <ApplicationsTab token={token} toast={toast} />}
    {tab === 'Payouts' && <div className="olist">{!payouts.length && <div className="empty">No payout requests.</div>}{payouts.map(p => (
      <article className="order" key={p.id}><div className="oline"><span className="oe">💸</span><div><b>{p.seller.storeName} · {money(p.amount)}</b><small>Send to: {p.payoutName ? `${p.payoutName} · ${p.payoutMpesa}` : `${p.seller.user.phone || 'no payout details'} (requested before payout details were required)`}{p.reference ? ' · Ref ' + p.reference : ''}</small></div>
        <span className={'chip ' + (p.status === 'PAID' ? 'delivered' : 'paid')}>{label(p.status)}</span></div>
        {p.status === 'PENDING' && <div className="acts"><button className="btn sm" onClick={() => { const ref = window.prompt('M-Pesa reference after you send the money:'); if (ref) act(`/admin/payouts/${p.id}/paid`, 'Marked as paid ✔', { reference: ref }); }}>Mark as paid</button></div>}</article>))}</div>}
  </main>);
}
