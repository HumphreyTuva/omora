'use client';
import ProductImage from './ProductImage';
import { useEffect, useState } from 'react';
import { call, useStore } from './store';
import GoogleButton from './GoogleButton';
import { normalizePhone } from './phone';
type Cat = { id: string; name: string; slug: string; icon?: string };
// Yellow outline icons, as in the design (the 📍 emoji is red and can't be recoloured)
const Pin = ({ size = 24 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFC400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.6" /></svg>;
const Chevron = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFC400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;
const money = (n: number) => 'KSh ' + n.toLocaleString('en-KE');

function Login() {
  const { login, setPanel } = useStore();
  const [mode, setMode] = useState<'phone' | 'email'>('phone'), [value, setValue] = useState(''), [code, setCode] = useState(''), [sent, setSent] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(''); try { await f(); } catch (e: any) { setErr(e.message); } setBusy(false); };
  const pick = (m: 'phone' | 'email') => { setMode(m); setValue(''); setSent(false); setCode(''); setErr(''); };
  const phoneNorm = normalizePhone(value), body = mode === 'phone' ? { phone: phoneNorm || value.trim() } : { email: value.trim().toLowerCase() };
  return (<div className="modal" role="dialog" aria-label="Sign in">
    <button className="x" onClick={() => setPanel('')} aria-label="Close">✕</button>
    <img src="/logo-dark.png" alt="Omora" /><h3>Sign in to Omora</h3>
    <GoogleButton />
    <div className="mtabs"><button className={mode === 'phone' ? 'on' : ''} onClick={() => pick('phone')}>Phone</button><button className={mode === 'email' ? 'on' : ''} onClick={() => pick('email')}>Email</button></div>
    {!sent ? <><label>{mode === 'phone' ? 'Phone number (any format works)' : 'Email address'}<input value={value} onChange={e => setValue(e.target.value)} type={mode === 'email' ? 'email' : 'tel'} inputMode={mode === 'email' ? 'email' : 'tel'} placeholder={mode === 'phone' ? '0712 345 678' : 'you@example.com'} /></label>
      <button className="btn" disabled={busy} onClick={() => run(async () => { await call('/auth/otp/request', 'POST', body); setSent(true); })}>Send code</button></>
    : <><label>6-digit code sent to {mode === 'phone' ? phoneNorm || value : value}<input value={code} onChange={e => setCode(e.target.value.trim())} inputMode="numeric" maxLength={6} /></label>
      <button className="btn" disabled={busy} onClick={() => run(async () => { const d = await call('/auth/otp/verify', 'POST', { ...body, code }); login(d.token, mode === 'phone' ? phoneNorm || value.trim() : ''); })}>Verify and continue</button>
      <small>Testing locally? The code is printed in the API terminal.</small></>}
    {err && <p className="err">{err}</p>}
  </div>);
}

export default function Shell({ cats }: { cats: Cat[] }) {
  const { unread, wish, items, count, qty, panel, setPanel, msg, token, logout, checkout, toast } = useStore();
  const [cfg, setCfg] = useState({ deliveryFee: 350, freeAbove: 20000 });
  useEffect(() => { call('/config').then(setCfg).catch(() => {}); }, []);
  const sub = items.reduce((a: number, i: any) => a + i.price * i.qty, 0), fee = !items.length ? 0 : cfg.freeAbove > 0 && sub >= cfg.freeAbove ? 0 : cfg.deliveryFee;
  const [code, setCode] = useState(''), [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const disc = applied?.discount || 0;
  useEffect(() => { if (!applied) return; if (!items.length) { setApplied(null); return; }
    call(`/coupons/check?code=${applied.code}&subtotal=${sub}`).then(r => setApplied({ code: applied.code, discount: r.discount })).catch(() => { setApplied(null); toast('Coupon no longer applies'); }); }, [sub]); // eslint-disable-line
  const applyCode = () => call(`/coupons/check?code=${encodeURIComponent(code)}&subtotal=${sub}`).then(r => { setApplied({ code: r.code, discount: r.discount }); toast('Coupon applied ✔'); }).catch(e => toast(e.message));
  const nav = [{ id: 'all', name: 'Home', icon: '🏠', slug: '' }, ...cats];
  const href = (c: any) => c.slug ? `/?category=${c.slug}#products` : '/';
  return (<>
    <div className={'scrim' + (panel ? ' on' : '')} onClick={() => setPanel('')} />
    <aside className={'side' + (panel === 'side' ? ' on' : '')} aria-label="Menu">
      <div className="side-top"><img src="/logo-dark.png" alt="Omora" /><button className="x" onClick={() => setPanel('')} aria-label="Close menu">✕</button></div>
      <div className="side-user"><span className="av">{token ? '✓' : '?'}</span><div><b>{token ? 'Signed in' : 'Welcome'}</b><small>Nairobi, Kenya</small></div></div>
      <nav>{nav.map((c: any, i) => <a key={c.id} href={href(c)} style={{ ['--i' as any]: i }} onClick={() => setPanel('')}><span>{c.icon || '🏠'}</span>{c.name}</a>)}</nav>
      <div className="side-foot">
        <p className="lbl">MY ACCOUNT</p>
        <a href="/orders" style={{ ['--i' as any]: 9 }} onClick={() => setPanel('')}><span>📦</span>My Orders</a>
        <a href="/wishlist" style={{ ['--i' as any]: 10 }} onClick={() => setPanel('')}><span>❤️</span>Wishlist{wish.length > 0 && <em>{wish.length}</em>}</a>
        <a href="/notifications" style={{ ['--i' as any]: 11 }} onClick={() => setPanel('')}><span>🔔</span>Notifications{unread > 0 && <em>{unread}</em>}</a>
        <a href="/seller" style={{ ['--i' as any]: 12 }} onClick={() => setPanel('')}><span>🏪</span>Seller Portal</a>
        <a href="#" className="out" style={{ ['--i' as any]: 13 }} onClick={e => { e.preventDefault(); token ? logout() : setPanel('login'); }}><span>{token ? '🚪' : '👤'}</span>{token ? 'Sign out' : 'Sign in'}</a>
      </div>
    </aside>

    <header className="top">
      <div className="strip"><span className="pinline"><Pin size={16} /> Deliver to <b>Nairobi, Kenya</b></span><span className="mid">🛡 Fast · Secure · Trusted</span><span className="links"><a href="/seller/apply">Become a Seller</a><a href="/orders">Track Order</a></span></div>
      <div className="bar">
        <button className="burger" onClick={() => setPanel('side')} aria-label="Open menu"><i /><i /><i /></button>
        <a className="logo" href="/"><img src="/logo-dark.png" alt="Omora All-in-One Marketplace" /></a>
        <form className="search" action="/"><input name="q" placeholder="Search for products, brands and categories…" /><button aria-label="Search">🔍</button></form>
        <div className="actions">
          <button className="loc" onClick={() => toast('Delivering to Nairobi, Kenya')} aria-label="Delivery location"><Pin size={28} /><span><small>Deliver to</small><b>Nairobi<Chevron /></b></span></button>
          <a className="ic bell" href="/notifications" aria-label="Notifications">🔔{unread > 0 && <em>{unread}</em>}<small>Alerts</small></a>
          <a className="ic" href="/wishlist" aria-label="Wishlist">♡<em>{wish.length}</em><small>Wishlist</small></a>
          <button className="ic" onClick={() => setPanel('cart')} aria-label="Cart">🛒<em key={count} className="pop">{count}</em><small>Cart</small></button>
          <button className="me" onClick={() => token ? logout() : setPanel('login')} aria-label="Account">{token ? '✓' : '👤'}</button>
        </div>
      </div>
      <nav className="cats"><a href="/" className="all">☰ All Categories</a><a href="/">Home</a>{cats.map(c => <a key={c.id} href={href(c)}>{c.name}</a>)}</nav>
    </header>

    <aside className={'drawer' + (panel === 'cart' ? ' on' : '')} aria-label="Cart">
      <div className="dh"><h3>Your Cart ({count})</h3><button className="x" onClick={() => setPanel('')} aria-label="Close cart">✕</button></div>
      <div className="db">{items.length ? items.map((i: any) => (
        <div className="line" key={i.id}><div className="pic"><ProductImage src={i.image} emoji={i.emoji} alt="" /></div><div><b>{i.name}</b><small>{money(i.price)}</small>
          <div className="qty"><button onClick={() => qty(i.id, -1)} aria-label="Less">−</button>{i.qty}<button onClick={() => qty(i.id, 1)} aria-label="More">+</button></div></div></div>
      )) : <div className="empty">🛒<br />Your cart is empty.<br /><br /><a className="btn" href="/#products" onClick={() => setPanel('')}>Start shopping</a></div>}</div>
      {items.length > 0 && <div className="df"><div className="coupon"><input value={code} onChange={e => setCode(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" /><button className="btn sm" onClick={applyCode}>Apply</button></div><div className="row"><span>Subtotal</span><span>{money(sub)}</span></div><div className="row"><span>Delivery</span><span>{fee ? money(fee) : 'Free'}</span></div>
        {disc > 0 && <div className="row" style={{ color: '#18a34a' }}><span>Coupon {applied?.code}</span><span>− {money(disc)}</span></div>}<div className="row t"><span>Total</span><span>{money(sub - disc + fee)}</span></div>
        <button className="btn" onClick={() => checkout(applied?.code)}>{token ? 'Pay with M-Pesa' : 'Sign in to checkout'}</button></div>}
    </aside>

    {panel === 'login' && <Login />}
    <nav className="tab" aria-label="Main"><a href="/">🏠<span>Home</span></a><a href="/orders">📦<span>Orders</span></a>
      <a href="#" onClick={e => { e.preventDefault(); setPanel('cart'); }}>🛒<span>Cart</span>{count > 0 && <em>{count}</em>}</a>
      <a href="/notifications">🔔<span>Alerts</span>{unread > 0 && <em>{unread}</em>}</a>
      <a href="#" onClick={e => { e.preventDefault(); token ? logout() : setPanel('login'); }}>👤<span>{token ? 'Sign out' : 'You'}</span></a></nav>
    <div className={'toast' + (msg ? ' on' : '')} role="status">{msg}</div>
  </>);
}
