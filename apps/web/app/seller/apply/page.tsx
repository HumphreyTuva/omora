'use client';
import { useEffect, useState } from 'react';
import { call, useStore } from '../../store';
import { normalizePhone } from '../../phone';
import { renderText } from '../../agreement';
const COUNTIES = ['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'];
const STEPS = ['Your business', 'Plan', 'Agreement'];
// Become a seller: business details, choose a plan, read and sign the agreement online (typed name + one-time code).
export default function Apply() {
  const { token, setPanel, toast, login } = useStore();
  const [ag, setAg] = useState<any>(null), [step, setStep] = useState(1), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [sentTo, setSentTo] = useState('');
  const [f, setF] = useState({ storeName: '', legalName: '', contactPerson: '', idNumber: '', kraPin: '', address: '', county: '', phone: '', email: '', categories: '', plan: 'STARTER', signedName: '', signedTitle: '', agree: false, code: '' });
  useEffect(() => { call('/sellers/agreement').then(setAg).catch(() => {}); setF(x => ({ ...x, phone: localStorage.getItem('omora-phone') || '' })); }, []);
  useEffect(() => { if (token) call('/sellers/application', 'GET', undefined, token).then((a: any) => { if (a?.id) window.location.href = '/seller/agreement'; }).catch(() => {}); }, [token]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const plan = ag?.plans?.find((p: any) => p.id === f.plan);
  const phone = normalizePhone(f.phone);
  const vars: Record<string, string> = ag && plan ? {
    date: new Date().toISOString().slice(0, 10), legalName: f.legalName.trim(), idNumber: f.idNumber.trim(), kraPin: f.kraPin.trim().toUpperCase(), address: `${f.address.trim()}, ${f.county.trim()}`,
    tradingName: f.storeName.trim(), representative: f.signedName.trim(), position: f.signedTitle.trim(), contact: `${f.email.trim()} / ${phone || f.phone}`, location: f.county.trim(),
    planName: plan.name, registration: String(plan.registration), monthly: plan.monthly.toLocaleString('en-KE'), commission: String(plan.commission) } : {};
  const text = ag && plan ? renderText(ag.sections, vars) : 'Loading the agreement…';
  const next1 = (e: React.FormEvent) => { e.preventDefault(); setErr(''); if (!phone) { setErr('Enter a valid Kenyan phone number, e.g. 0712 345 678'); return; } if (!/^[A-Za-z]\d{9}[A-Za-z]$/.test(f.kraPin.trim())) { setErr('Enter a valid KRA PIN, e.g. A123456789Z'); return; } setStep(2); window.scrollTo(0, 0); };
  const sendCode = async () => { setBusy(true); setErr(''); try { const r = await call('/sellers/sign-code', 'POST', undefined, token); setSentTo(r.to); toast('Code sent to ' + r.to); } catch (e: any) { setErr(e.message); } setBusy(false); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); if (!f.agree) { setErr('Tick the box to accept the agreement'); return; }
    setBusy(true);
    try { const d = await call('/sellers/application', 'POST', { ...f, phone, kraPin: f.kraPin.trim().toUpperCase() }, token); login(d.token, localStorage.getItem('omora-phone') || ''); toast('Application submitted ✔'); window.location.href = '/seller'; }
    catch (x: any) { setErr(x.message); setBusy(false); }
  };
  if (!token) return <main className="wrap"><div className="sform" style={{ maxWidth: 480, margin: '0 auto' }}><h3>Become an Omora seller</h3><p style={{ color: '#6b6b6b', fontSize: 14 }}>Sign in first. It takes about 5 minutes: your business details, a plan, and signing the seller agreement online.</p><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  return (<main className="wrap"><div style={{ maxWidth: 720, margin: '0 auto' }}>
    <div className="h"><h2>Become an Omora seller</h2></div>
    <ol className="wsteps">{STEPS.map((s, i) => <li key={s} className={i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''}><span>{i + 1 < step ? '✓' : i + 1}</span>{s}</li>)}</ol>
    {step === 1 && <form className="sform" onSubmit={next1}>
      <label>Store name (shown to customers)<input required minLength={2} maxLength={80} value={f.storeName} onChange={set('storeName')} placeholder="e.g. Hussein Gadgets" /></label>
      <label>Legal or registered business name (or your full name)<input required minLength={2} maxLength={120} value={f.legalName} onChange={set('legalName')} /></label>
      <label>Contact person<input required minLength={2} maxLength={80} value={f.contactPerson} onChange={set('contactPerson')} /></label>
      <div className="two"><label>ID / registration number<input required minLength={4} maxLength={30} value={f.idNumber} onChange={set('idNumber')} /></label><label>KRA PIN<input required value={f.kraPin} onChange={set('kraPin')} placeholder="A123456789Z" /></label></div>
      <label>Business address (street, building)<input required minLength={5} maxLength={200} value={f.address} onChange={set('address')} /></label>
      <div className="two"><label>County<input required list="counties" value={f.county} onChange={set('county')} /></label><label>Phone / WhatsApp<input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0712 345 678" /></label></div>
      <datalist id="counties">{COUNTIES.map(c => <option key={c} value={c} />)}</datalist>
      <label>Email<input required type="email" value={f.email} onChange={set('email')} /></label>
      <label>What will you sell?<input required minLength={3} maxLength={300} value={f.categories} onChange={set('categories')} placeholder="e.g. phones, laptops, accessories" /></label>
      <small>Next you will be asked to upload ID and KRA documents for verification if Omora requests them. Payout details are added later in your Seller Portal.</small>
      {err && <p className="err">{err}</p>}<button className="btn">Continue</button></form>}
    {step === 2 && <form className="sform" onSubmit={e => { e.preventDefault(); setF(x => ({ ...x, signedName: x.signedName || x.contactPerson })); setStep(3); window.scrollTo(0, 0); }}>
      <h3>Choose a plan</h3>
      <div className="plans">{ag?.plans?.map((p: any) => <label key={p.id} className={'plan' + (f.plan === p.id ? ' on' : '')}><input type="radio" name="plan" checked={f.plan === p.id} onChange={() => setF({ ...f, plan: p.id })} /><span><b>{p.name}</b><small>Registration KES {p.registration} once · KES {p.monthly.toLocaleString('en-KE')} a month</small><strong>{p.commission}% commission on each completed sale</strong></span></label>)}</div>
      <small>These are Omora’s introductory terms. Fees become binding as set out in the agreement on the next page.</small>
      <div className="acts"><button type="button" className="btn o2" onClick={() => setStep(1)}>Back</button><button className="btn">Continue</button></div></form>}
    {step === 3 && <form className="sform" onSubmit={submit}>
      <h3>Seller agreement</h3><small>Read the agreement below. It is filled in with your details.</small>
      <div className="agree-box" tabIndex={0}>{text}</div>
      <label className="chk2"><input type="checkbox" checked={f.agree} onChange={e => setF({ ...f, agree: e.target.checked })} /> I have read and agree to this Seller Registration &amp; Marketplace Agreement, and I am authorised to sign for the seller named above.</label>
      <div className="two"><label>Your full name (as signature)<input required minLength={2} maxLength={80} value={f.signedName} onChange={set('signedName')} /></label><label>Your position<input required minLength={2} maxLength={60} value={f.signedTitle} onChange={set('signedTitle')} placeholder="e.g. Owner" /></label></div>
      <div className="two"><button type="button" className="btn o2" disabled={busy} onClick={sendCode}>{sentTo ? 'Send a new code' : 'Send me a signing code'}</button><label>6-digit code{sentTo ? ` sent to ${sentTo}` : ''}<input required inputMode="numeric" maxLength={6} value={f.code} onChange={e => setF({ ...f, code: e.target.value.trim() })} /></label></div>
      <small>Typing your name and entering the one-time code counts as your electronic signature. We record the time, the agreement version and your device details, and Omora countersigns when it approves your account.</small>
      {err && <p className="err">{err}</p>}
      <div className="acts"><button type="button" className="btn o2" onClick={() => setStep(2)}>Back</button><button className="btn" disabled={busy || f.code.length !== 6 || !f.signedName || !f.signedTitle}>Sign and submit</button></div></form>}
  </div></main>);
}
