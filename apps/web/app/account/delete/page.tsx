'use client';
import { useState } from 'react';
import { call, useStore } from '../../store';
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
// Public page for account deletion (Google Play asks for a web link to it). Signed-in customers can delete here directly.
export default function DeleteAccount() {
  const { token, setPanel, logout, toast } = useStore();
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const del = async () => {
    setBusy(true); setErr('');
    try { await call('/account/delete', 'POST', { confirm: 'DELETE' }, token); logout(); toast('Your account was deleted'); window.location.href = '/'; }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  return (<main className="wrap legal"><h1>Delete your Omora account</h1>
    <p>You can delete your account here at any time. This cannot be undone.</p>
    <h2>What we delete</h2>
    <ul><li>Your name, phone number and email address</li><li>Saved delivery addresses on your past orders</li><li>Your wishlist and notifications</li><li>The text of any reviews you wrote</li></ul>
    <h2>What we keep</h2>
    <p>Order and payment records, without your personal details, because we need them for accounting and legal reasons.</p>
    <h2>Before you delete</h2>
    <p>You can’t delete your account while you have orders that are paid but not yet delivered. Sellers close their accounts through support so that open orders and payouts can be settled first.</p>
    {token ? <div className="sform" style={{ maxWidth: 460 }}>
      <label>Type DELETE to confirm<input value={text} onChange={e => setText(e.target.value)} placeholder="DELETE" autoComplete="off" /></label>
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy || text.trim() !== 'DELETE'} onClick={del}>Permanently delete my account</button>
    </div> : <div className="sform" style={{ maxWidth: 460 }}><p>Sign in to delete your account yourself.</p><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div>}
    {contactEmail && <p style={{ marginTop: 18 }}>Can’t sign in, or you are a seller? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a> from the address or number on your account and ask us to delete it.</p>}
  </main>);
}
