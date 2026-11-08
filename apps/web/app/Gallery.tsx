'use client';
import { useRef, useState } from 'react';
import ProductImage from './ProductImage';
// Product photo viewer: tap a thumbnail, use the arrows, or swipe to change the main photo.
export default function Gallery({ images, emoji, name, badge }: { images: { id: string; url: string }[]; emoji?: string; name: string; badge?: string | null }) {
  const [i, setI] = useState(0);
  const x0 = useRef<number | null>(null);
  const n = images.length, go = (k: number) => setI(((k % n) + n) % n);
  return (<div>
    <div className="pic big gal"
      onTouchStart={e => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={e => { if (x0.current === null || n < 2) return; const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0.current = null; }}>
      {n ? <ProductImage key={images[i].id} src={images[i].url} emoji={emoji} alt={name} /> : <span>{emoji || '📦'}</span>}
      {badge && <b className="badge">{badge}</b>}
      {n > 1 && <>
        <button type="button" className="gal-arr l" onClick={() => go(i - 1)} aria-label="Previous photo">‹</button>
        <button type="button" className="gal-arr r" onClick={() => go(i + 1)} aria-label="Next photo">›</button>
        <span className="gal-count">{i + 1} / {n}</span></>}
    </div>
    {n > 1 && <div className="thumbs">{images.map((im, k) => <button type="button" key={im.id} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Show photo ${k + 1}`}><img src={im.url} alt="" /></button>)}</div>}
  </div>);
}
