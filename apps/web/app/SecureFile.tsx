'use client';
import { useEffect, useState } from 'react';
import { API, useStore } from './store';
// Shows a private document. A plain <img> can't send the sign-in header, so the file is fetched here and shown from memory.
export default function SecureFile({ path, mime, alt }: { path: string; mime: string; alt: string }) {
  const { token } = useStore();
  const [url, setUrl] = useState('');
  useEffect(() => {
    let made = '', dead = false;
    fetch(API + path, { headers: { Authorization: `Bearer ${token}` } }).then(r => (r.ok ? r.blob() : Promise.reject())).then(b => { if (dead) return; made = URL.createObjectURL(b); setUrl(made); }).catch(() => {});
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [path, token]);
  if (!url) return <div className="docload">Loading…</div>;
  return mime === 'application/pdf' ? <a className="btn sm o2" href={url} target="_blank" rel="noreferrer">Open PDF</a> : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={alt} /></a>;
}
