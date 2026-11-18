'use client';
import { useState } from 'react';
import { call } from '../../store';
// The unsubscribe link in every offer. Free, needs no sign-in, and asks for one tap (so mail scanners that open links don't unsubscribe people by accident).
export default function Unsubscribe({ params }: { params: { token: string } }) {
  const [state, setState] = useState<'ask' | 'done' | 'bad'>('ask'), [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await call('/marketing/unsubscribe', 'POST', { token: params.token }); setState('done'); } catch { setState('bad'); } setBusy(false); };
  return (<main className="wrap legal" style={{ textAlign: 'center' }}>
    {state === 'ask' && <><h1>Stop offers from Omora?</h1><p>You will no longer get offers and news from us by email, SMS or WhatsApp. Order updates and sign-in codes are not affected.</p><button className="btn" disabled={busy} onClick={go}>Yes, unsubscribe me</button></>}
    {state === 'done' && <><h1>You are unsubscribed ✓</h1><p>We will not send you offers any more. You can turn them back on any time from <a href="/account/preferences">Offers &amp; news</a>.</p><a className="btn" href="/">Back to Omora</a></>}
    {state === 'bad' && <><h1>This link is not valid</h1><p>It may have been used already. You can manage your choices from <a href="/account/preferences">Offers &amp; news</a> after signing in, or contact us from the Contact page.</p></>}
  </main>);
}
