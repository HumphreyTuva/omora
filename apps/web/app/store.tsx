'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { normalizePhone } from './phone';
export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
export type Item = { id: string; name: string; emoji?: string; image?: string; price: number; qty: number };
export type PayState = { phase: 'waiting' | 'success' | 'failed' | 'timeout'; orderId: string; amount: number; reason?: string };
type Panel = '' | 'side' | 'cart' | 'login';
export async function call(path: string, method = 'GET', body?: unknown, token?: string | null) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error([].concat(d.message || 'Something went wrong. Try again.').join(', '));
  return d;
}
const Ctx = createContext<any>(null);
export const useStore = () => useContext(Ctx);
export function Provider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('');
  const [msg, setMsg] = useState('');
  const [wish, setWish] = useState<string[]>([]);
  const [unread, setUnread] = useState(0);
  const t = useRef<any>();
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem('omora-cart') || '[]')); setToken(localStorage.getItem('omora-token')); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('omora-cart', JSON.stringify(items)); } catch {} }, [items]);
  useEffect(() => { if (token) call('/wishlist', 'GET', undefined, token).then((l: any[]) => setWish(l.map(p => p.id))).catch(() => {}); else setWish([]); }, [token]);
  useEffect(() => { if (!token) { setUnread(0); return; } const f = () => call('/notifications', 'GET', undefined, token).then(r => setUnread(r.unread)).catch(() => {}); f(); const t = setInterval(f, 30000); return () => clearInterval(t); }, [token]);
  const toast = (m: string) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(''), 2600); };
  const add = (p: Omit<Item, 'qty'>) => { setItems(a => a.find(i => i.id === p.id) ? a.map(i => i.id === p.id ? { ...i, qty: Math.min(i.qty + 1, 20) } : i) : [...a, { ...p, qty: 1 }]); toast('Added to cart ✔'); };
  const qty = (id: string, d: number) => setItems(a => a.map(i => i.id === id ? { ...i, qty: i.qty + d } : i).filter(i => i.qty > 0));
  const login = (tk: string, phone: string) => { localStorage.setItem('omora-token', tk); localStorage.setItem('omora-phone', phone); setToken(tk); setPanel(''); toast('Welcome to Omora!'); };
  const logout = () => { localStorage.removeItem('omora-token'); setToken(null); toast('Signed out'); };
  const [pay, setPay] = useState<PayState | null>(null);
  const askPhone = (): string | null => {
    let phone = localStorage.getItem('omora-phone') || '';
    if (!phone) { const raw = (window.prompt('Enter your M-Pesa phone number, e.g. 0712 345 678') || '').trim(); if (!raw) return null; const p = normalizePhone(raw); if (!p) { toast('That phone number does not look right'); return null; } phone = p; localStorage.setItem('omora-phone', phone); }
    return phone;
  };
  // Sends the M-Pesa prompt, then asks the server every 5 s (up to 2 minutes) until the payment is confirmed, failed or timed out.
  const payOrder = async (orderId: string, amount: number, phoneArg?: string) => {
    if (!token) { setPanel('login'); return; }
    const phone = phoneArg || askPhone(); if (!phone) return;
    setPay({ phase: 'waiting', orderId, amount });
    try {
      const p = await call('/payments/initiate', 'POST', { orderId, phone }, token);
      await call('/payments/dev/confirm/' + p.paymentId, 'POST', undefined, token).catch(() => {}); // mock mode only
    } catch (e: any) { setPay({ phase: 'failed', orderId, amount, reason: e.message }); return; }
    for (let i = 0; i < 24; i++) {
      if (i) await new Promise(r => setTimeout(r, 5000));
      const v = await call('/payments/verify/' + orderId, 'POST', undefined, token).catch(() => null);
      if (!v) continue;
      if (v.paid) { setPay({ phase: 'success', orderId, amount }); return; }
      if (v.failed) { setPay({ phase: 'failed', orderId, amount, reason: v.reason }); return; }
    }
    setPay({ phase: 'timeout', orderId, amount });
  };
  const payCheck = async () => {
    if (!pay) return;
    try {
      const v = await call('/payments/verify/' + pay.orderId, 'POST', undefined, token);
      if (v.paid) setPay({ ...pay, phase: 'success' }); else if (v.failed) setPay({ ...pay, phase: 'failed', reason: v.reason }); else toast('Still waiting for the payment');
    } catch (e: any) { toast(e.message); }
  };
  const checkout = async (coupon?: string) => {
    if (!token) { setPanel('login'); return; }
    const phone = askPhone(); if (!phone) return;
    try {
      const o = await call('/orders', 'POST', { items: items.map(i => ({ productId: i.id, quantity: i.qty })), coupon }, token);
      setItems([]); setPanel('');
      await payOrder(o.id, o.total, phone);
    } catch (e: any) { toast(e.message); }
  };
  const toggleWish = async (id: string) => {
    if (!token) { toast('Sign in to save items'); setPanel('login'); return; }
    try { const r = await call('/wishlist/' + id, 'POST', undefined, token); setWish(w => r.saved ? [...w, id] : w.filter(x => x !== id)); toast(r.saved ? 'Saved to wishlist ♥' : 'Removed from wishlist'); } catch (e: any) { toast(e.message); }
  };
  const count = items.reduce((a, i) => a + i.qty, 0);
  return <Ctx.Provider value={{ pay, setPay, payOrder, payCheck, unread, setUnread, wish, toggleWish, items, count, add, qty, token, panel, setPanel, msg, toast, login, logout, checkout }}>{children}</Ctx.Provider>;
}
