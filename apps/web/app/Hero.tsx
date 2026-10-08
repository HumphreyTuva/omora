'use client';
import { useEffect, useState } from 'react';
const SL = [
  { h: <>Everything<br />You Need.<br /><b>Connected.</b></>, p: 'Shop from trusted sellers across Africa. Best deals on electronics, fashion, home, beauty, auto and more.', art: ['📱', '🎧', '👟'] },
  { h: <>Tech Deals<br />Up To <b>50% Off</b></>, p: 'The latest gadgets at unbeatable prices, delivered fast across Kenya.', art: ['💻', '⌚', '📺'] },
  { h: <>Sell On<br /><b>Omora.</b></>, p: 'Reach thousands of customers. Open your store and start earning today.', art: ['🏪', '📦', '💰'] },
];
export default function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(n => (n + 1) % SL.length), 5500); return () => clearInterval(t); }, [i]);
  const go = (n: number) => setI((n + SL.length) % SL.length);
  return (<section className="hero" aria-roledescription="carousel">
    <button className="arr l" onClick={() => go(i - 1)} aria-label="Previous">‹</button>
    <div className="slides">{SL.map((s, k) => (
      <div key={k} className={'slide' + (k === i ? ' on' : '')} aria-hidden={k !== i}><small>OMORA MARKETPLACE</small><h1>{s.h}</h1><p>{s.p}</p>
        <div className="cta"><a className="btn" href="#products">Shop Now ›</a><a className="btn o" href="/seller/apply">Become a Seller</a></div>
        <div className="art">{s.art.map((e, j) => <span key={j}>{e}</span>)}</div></div>))}</div>
    <button className="arr r" onClick={() => go(i + 1)} aria-label="Next">›</button>
    <div className="dots">{SL.map((_, k) => <i key={k} className={k === i ? 'on' : ''} onClick={() => go(k)} />)}</div>
  </section>);
}
