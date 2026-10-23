'use client';
import ProductImage from '../ProductImage';
import { useCallback, useEffect, useState } from 'react';
import { API, call, useStore } from '../store';
const money = (n: number) => 'KSh ' + (n || 0).toLocaleString('en-KE');
const label = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
const NEXT: Record<string, [string, string]> = { PAID: ['SELLER_CONFIRMED', 'Confirm order'], SELLER_CONFIRMED: ['PROCESSING', 'Start processing'], PROCESSING: ['READY_FOR_PICKUP', 'Mark ready for pickup'] };
export default function Seller() {
  const { token, setPanel, toast } = useStore();
  const [tab, setTab] = useState('Overview'), [e, setE] = useState<any>(null), [orders, setOrders] = useState<any[]>([]), [prods, setProds] = useState<any[]>([]), [cats, setCats] = useState<any[]>([]), [denied, setDenied] = useState(false);
  const [f, setF] = useState({ name: '', categoryId: '', description: '', price: '', stock: '' }), [files, setFiles] = useState<File[]>([]), [tick, setTick] = useState(0);
  const load = useCallback(async () => {
    try { const [a, b, c, d] = await Promise.all([call('/seller/earnings', 'GET', undefined, token), call('/seller/orders', 'GET', undefined, token), call('/seller/products', 'GET', undefined, token), call('/categories')]); setE(a); setOrders(b); setProds(c); setCats(d); }
    catch { setDenied(true); }
  }, [token]);
  useEffect(() => { if (token) load(); }, [token, load]);
  if (!token) return <main className="wrap"><div className="empty">Sign in with your seller phone number.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  if (denied) return <main className="wrap"><div className="empty">This account isn’t a seller yet. <a href="/seller/apply"><b>Apply to sell</b></a> (testing seller: +254700000000).</div></main>;
  const move = async (id: string, status: string) => { try { await call(`/orders/items/${id}/status`, 'PATCH', { status }, token); toast('Order updated ✔'); load(); } catch (x: any) { toast(x.message); } };
  const payout = async () => { try { await call('/seller/payouts', 'POST', undefined, token); toast('Payout requested ✔'); load(); } catch (x: any) { toast(x.message); } };
  const removeProduct = async (p: any) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await call(`/seller/products/${p.id}`, 'DELETE', undefined, token); toast('Product deleted'); load(); } catch (x: any) { toast(x.message); }
  };
  const submit = async (ev: React.FormEvent) => { ev.preventDefault(); try { if (files.some(x => x.size > 3 * 1024 * 1024)) { toast('Each photo must be under 3 MB'); return; }
      const prod = await call('/seller/products', 'POST', { ...f, price: +f.price, stock: +f.stock }, token); let ok = true;
      for (const file of files) { const fd = new FormData(); fd.append('image', file);
        const r = await fetch(`${API}/seller/products/${prod.id}/images`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (!r.ok) { ok = false; toast('Product saved, but a photo failed: ' + ((await r.json().catch(() => ({}))).message || 'upload error')); break; } }
      if (ok) toast('Submitted for review ✔'); setFiles([]); setTick(t => t + 1); setF({ name: '', categoryId: '', description: '', price: '', stock: '' }); load(); } catch (x: any) { toast(x.message); } };
  return (<main className="wrap"><div className="h"><h2>Seller Portal</h2>
    <div className="tabs">{['Overview', 'Orders', 'Products'].map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}{t === 'Orders' && e?.orders ? ` (${e.orders})` : ''}</button>)}</div></div>
    {tab === 'Overview' && e && <div className="stats">
      <div><small>Available balance</small><b>{money(e.available)}</b></div><div><small>Pending balance</small><b>{money(e.pending)}</b></div>
      <div><small>Total sales</small><b>{money(e.sales)}</b></div><div><small>New orders to confirm</small><b>{e.orders}</b></div>
      <div><small>Omora commission paid</small><b>{money(e.commission)}</b></div><div><small>Products</small><b>{prods.length}</b></div></div>}
    {tab === 'Overview' && e && <button className="btn" style={{ marginTop: 16 }} disabled={e.available < 500} onClick={payout}>Request payout ({money(e.available)})</button>}
    {tab === 'Orders' && <div className="olist">{!orders.length && <div className="empty">No paid orders yet.</div>}{orders.map(i => (
      <article className="order" key={i.id}><div className="oline"><span className="oe">{i.product.emoji}</span>
        <div><b>{i.product.name}</b><small>Order #{i.order.id.slice(-8).toUpperCase()} · {i.quantity} × {money(i.price)} · You earn {money(i.price * i.quantity - i.commission)}{i.order.deliveryArea && <> · Deliver to {i.order.deliveryArea}</>}</small></div>
        <span className={'chip ' + i.status.toLowerCase()}>{label(i.status)}</span></div>
        {NEXT[i.status] && <button className="btn sm" onClick={() => move(i.id, NEXT[i.status][0])}>{NEXT[i.status][1]}</button>}</article>))}</div>}
    {tab === 'Products' && <div className="pd2">
      <form className="sform" onSubmit={submit}><h3>Add a product</h3>
        <label>Name<input required value={f.name} onChange={x => setF({ ...f, name: x.target.value })} /></label>
        <label>Category<select required value={f.categoryId} onChange={x => setF({ ...f, categoryId: x.target.value })}><option value="">Choose…</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Description<textarea required value={f.description} onChange={x => setF({ ...f, description: x.target.value })} /></label>
        <div className="two"><label>Price (KSh)<input required type="number" min={1} value={f.price} onChange={x => setF({ ...f, price: x.target.value })} /></label><label>Stock<input required type="number" min={0} value={f.stock} onChange={x => setF({ ...f, stock: x.target.value })} /></label></div>
        <label>Photos (up to 5 · JPG, PNG or WebP · 3 MB each)<input key={tick} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={x => setFiles(Array.from(x.target.files || []).slice(0, 5))} /></label>{files.length > 0 && <small>{files.length} photo(s) selected</small>}
        <button className="btn">Submit for review</button></form>
      <div className="olist">{prods.map(p => <article className="order" key={p.id}><div className="oline"><span className="oe"><ProductImage src={p.images?.[0]?.url} emoji={p.emoji} alt="" /></span><div><b>{p.name}</b><small>{money(p.price)} · {p.stock} in stock</small></div><span className={'chip ' + (p.status === 'LIVE' ? 'delivered' : 'paid')}>{label(p.status)}</span></div>
        <div className="acts" style={{ marginTop: 8 }}><a className="btn sm" href={`/seller/products/${p.id}`}>Edit</a><button className="btn sm o2" onClick={() => removeProduct(p)}>Delete</button></div></article>)}</div></div>}
  </main>);
}
