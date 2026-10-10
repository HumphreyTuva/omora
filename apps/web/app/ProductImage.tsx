'use client';
import { useState } from 'react';
// Shows the product photo; if it can't be loaded (deleted, offline), falls back to the emoji instead of a broken-image icon.
export default function ProductImage({ src, emoji, alt }: { src?: string; emoji?: string; alt: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <span>{emoji || '📦'}</span>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setBad(true)} />;
}
