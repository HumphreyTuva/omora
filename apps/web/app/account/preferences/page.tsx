'use client';
import { useEffect, useState } from 'react';
import { call, useStore } from '../../store';
export default function Preferences() {
  const { token, setPanel, toast } = useStore();
  const [p, setP] = useState<any>(null), [c, setC] = useState({ email: false, sms: false, whatsapp: false }), [busy, setBusy] = useState(false);
  useEffect(() => { if (token) call('/account/preferences', 'GET', undefined, token).then(r => { setP(r); setC({ email: r.email, sms: r.sms, whatsapp: r.whatsapp }); }).catch(() => {}); }, [token]);
  if (!token) return <main className="wrap"><div className="empty">Sign in to manage your offers and news.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  const save = async (v: typeof c) => { setBusy(true); try { const r = await call('/account/preferences', 'PUT', v, token); setP(r); setC({ email: r.email, sms: r.sms, whatsapp: r.whatsapp }); toast('Saved ✔'); } catch (e: any) { toast(e.message); } setBusy(false); };
  return (<main className="wrap legal"><h1>Offers &amp; news</h1>
    <p>Choose if and how Omora may contact you with offers, deals and news. We only use the channels you tick, and you can change your mind at any time. Order updates and sign-in codes are separate and are not affected.</p>
    {!p ? <p>Loading…</p> : <div className="sform" style={{ maxWidth: 460 }}>
      <label className="chk2"><input type="checkbox" disabled={!p.hasEmail} checked={c.email} onChange={e => setC({ ...c, email: e.target.checked })} /> Email{!p.hasEmail ? ' (add an email address to your account first)' : ''}</label>
      <label className="chk2"><input type="checkbox" disabled={!p.hasPhone} checked={c.sms} onChange={e => setC({ ...c, sms: e.target.checked })} /> SMS{!p.hasPhone ? ' (sign in with your phone number to use this)' : ''}</label>
      <label className="chk2"><input type="checkbox" disabled={!p.hasPhone} checked={c.whatsapp} onChange={e => setC({ ...c, whatsapp: e.target.checked })} /> WhatsApp{!p.hasPhone ? ' (sign in with your phone number to use this)' : ''}</label>
      <div className="acts"><button className="btn" disabled={busy} onClick={() => save(c)}>Save my choices</button><button className="btn o2" disabled={busy} onClick={() => save({ email: false, sms: false, whatsapp: false })}>Unsubscribe from everything</button></div></div>}
  </main>);
}
