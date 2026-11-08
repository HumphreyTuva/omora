'use client';
import { useEffect, useState } from 'react';
import { call, useStore } from '../../store';
const label = (s: string) => s.toLowerCase().replace(/^\w/, c => c.toUpperCase());
// The seller's own signed copy of the agreement (read-only, printable).
export default function SignedAgreement() {
  const { token, setPanel } = useStore();
  const [a, setA] = useState<any>(null), [done, setDone] = useState(false);
  useEffect(() => { if (token) call('/sellers/application', 'GET', undefined, token).then(r => { setA(r); setDone(true); }).catch(() => setDone(true)); }, [token]);
  if (!token) return <main className="wrap"><div className="empty">Sign in to see your seller agreement.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  if (done && !a?.id) return <main className="wrap"><div className="empty">You have not signed the seller agreement yet.<br /><br /><a className="btn" href="/seller/apply">Complete your seller details</a></div></main>;
  if (!a) return <main className="wrap"><div className="empty">Loading…</div></main>;
  return (<main className="wrap legal"><a className="back" href="/seller">‹ Seller Portal</a><h1>Your seller agreement</h1>
    <div className="addr">Status: <b>{label(a.status)}</b>{a.status === 'APPROVED' ? ' · countersigned by Omora' : ''}{a.reviewNote ? ' · ' + a.reviewNote : ''}<br />
      Signed by {a.signedName}, {a.signedTitle} on {new Date(a.signedAt).toLocaleString('en-KE')} · plan {label(a.plan)} · version {a.agreementVersion}</div>
    <pre className="agree-box" style={{ maxHeight: 'none' }}>{a.agreementText}</pre>
    <button className="btn" onClick={() => window.print()}>Print or save as PDF</button>
  </main>);
}
