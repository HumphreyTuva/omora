'use client';
import { useState } from 'react';
import { call, useStore } from '../../store';
export default function Apply() {
  const { token, setPanel, toast, login } = useStore();
  const [name, setName] = useState(''), [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const d = await call('/sellers/apply', 'POST', { storeName: name }, token); login(d.token, localStorage.getItem('omora-phone') || ''); toast('Application sent. We’ll verify your store soon.'); window.location.href = '/seller'; }
    catch (x: any) { toast(x.message); setBusy(false); }
  };
  return (<main className="wrap"><form className="sform" style={{ maxWidth: 480, margin: '0 auto' }} onSubmit={submit}>
    <h3>Become an Omora seller</h3><p style={{ color: '#6b6b6b', fontSize: 14 }}>Reach customers across Kenya. Apply with your store name — we verify every seller before products go live.</p>
    {!token ? <><p>Sign in with your phone number to apply.</p><button type="button" className="btn" onClick={() => setPanel('login')}>Sign in</button></>
    : <><label>Store name<input required minLength={3} maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hussein Gadgets" /></label>
      <button className="btn" disabled={busy}>Apply to sell</button></>}
  </form></main>);
}
