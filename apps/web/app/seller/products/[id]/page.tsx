'use client';
import { useCallback, useEffect, useState } from 'react';
import { API, call, useStore } from '../../../store';
const MAX_PHOTOS = 5;
const label = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
export default function EditProduct({ params }: { params: { id: string } }) {
  const { token, setPanel, toast } = useStore();
  const [p, setP] = useState<any>(null), [cats, setCats] = useState<any[]>([]), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const [f, setF] = useState({ name: '', categoryId: '', description: '', price: '', salePrice: '', stock: '' });
  const load = useCallback(async () => {
    try {
      const [prod, c] = await Promise.all([call('/seller/products/' + params.id, 'GET', undefined, token), call('/categories')]);
      setP(prod); setCats(c);
      setF({ name: prod.name, categoryId: prod.categoryId, description: prod.description || '', price: String(prod.price), salePrice: prod.salePrice ? String(prod.salePrice) : '', stock: String(prod.stock) });
    } catch (e: any) { setErr(e.message); }
  }, [token, params.id]);
  useEffect(() => { if (token) load(); }, [token, load]);
  if (!token) return <main className="wrap"><div className="empty">Sign in with your seller account.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  if (err) return <main className="wrap"><div className="empty">{err}<br /><br /><a className="btn" href="/seller">Back to Seller Portal</a></div></main>;
  if (!p) return <main className="wrap"><div className="empty">Loading…</div></main>;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await call('/seller/products/' + p.id, 'PATCH', { name: f.name, categoryId: f.categoryId, description: f.description, price: +f.price, salePrice: f.salePrice ? +f.salePrice : null, stock: +f.stock }, token);
      toast(r.sentForReview ? 'Saved. Your product is back in review and will be live once approved.' : 'Saved ✔'); await load();
    } catch (x: any) { toast(x.message); }
    setBusy(false);
  };
  const addPhotos = async (files: File[]) => {
    const room = MAX_PHOTOS - p.images.length;
    if (!files.length) return;
    if (files.length > room) { toast(`You can add ${room} more photo(s)`); setTick(t => t + 1); return; }
    if (files.some(x => x.size > 3 * 1024 * 1024)) { toast('Each photo must be under 3 MB'); setTick(t => t + 1); return; }
    setBusy(true);
    for (const file of files) {
      const fd = new FormData(); fd.append('image', file);
      const r = await fetch(`${API}/seller/products/${p.id}/images`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!r.ok) { toast('Photo failed: ' + ((await r.json().catch(() => ({}))).message || 'upload error')); break; }
    }
    setTick(t => t + 1); await load(); setBusy(false);
    if (['LIVE', 'APPROVED'].includes(p.status)) toast('Photos added. The product is back in review.');
  };
  const removePhoto = async (imageId: string) => {
    if (!window.confirm('Remove this photo?')) return;
    try { await call(`/seller/products/${p.id}/images/${imageId}`, 'DELETE', undefined, token); await load(); } catch (x: any) { toast(x.message); }
  };
  const del = async () => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await call('/seller/products/' + p.id, 'DELETE', undefined, token); toast('Product deleted'); window.location.href = '/seller'; } catch (x: any) { toast(x.message); }
  };
  return (<main className="wrap">
    <a className="back" href="/seller">‹ Seller Portal</a>
    <div className="h"><h2>Edit product</h2><span className={'chip ' + (p.status === 'LIVE' ? 'delivered' : 'paid')}>{label(p.status)}</span></div>
    <div className="pd2">
      <form className="sform" onSubmit={save}>
        <label>Name<input required minLength={2} maxLength={120} value={f.name} onChange={set('name')} /></label>
        <label>Category<select required value={f.categoryId} onChange={set('categoryId')}>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Description<textarea required value={f.description} onChange={set('description')} /></label>
        <div className="two"><label>Price (KSh)<input required type="number" min={1} value={f.price} onChange={set('price')} /></label><label>Sale price (optional)<input type="number" min={1} value={f.salePrice} onChange={set('salePrice')} placeholder="None" /></label></div>
        <label>Stock<input required type="number" min={0} value={f.stock} onChange={set('stock')} /></label>
        <small>Price, sale price and stock update straight away. Changing the name, description, category or photos of a live product sends it back for approval.</small>
        <button className="btn" disabled={busy}>Save changes</button>
      </form>
      <div>
        <div className="sform">
          <h3>Photos ({p.images.length}/{MAX_PHOTOS})</h3>
          {p.images.length === 0 && <small>No photos yet. Products with photos sell better.</small>}
          <div className="photogrid">{p.images.map((i: any) => <div className="ph" key={i.id}><img src={i.url} alt="" /><button type="button" onClick={() => removePhoto(i.id)} aria-label="Remove photo">✕</button></div>)}</div>
          {p.images.length < MAX_PHOTOS && <label>Add photos (JPG, PNG or WebP · 3 MB each)<input key={tick} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e => addPhotos(Array.from(e.target.files || []))} /></label>}
        </div>
        <div className="sform" style={{ marginTop: 14 }}>
          <h3>Delete product</h3>
          <small>A product nobody has ordered is removed completely. If it has been ordered, it is hidden instead, so past orders stay intact.</small>
          <button type="button" className="btn o2" onClick={del}>Delete this product</button>
        </div>
      </div>
    </div>
  </main>);
}
