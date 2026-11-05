'use client';
import { useEffect } from 'react';
// Registers the small service worker (see public/sw.js) so Android can install Omora like an app.
export default function PwaRegister() {
  useEffect(() => { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {}); }, []);
  return null;
}
