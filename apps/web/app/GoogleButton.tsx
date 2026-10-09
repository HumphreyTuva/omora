'use client';
import { useEffect, useRef } from 'react';
import { call, useStore } from './store';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
// Google's own "Continue with Google" button. Shows nothing until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.
export default function GoogleButton() {
  const { login, toast } = useStore();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!CLIENT_ID) return;
    const init = () => {
      const g = (window as any).google;
      if (!g || !box.current) return;
      g.accounts.id.initialize({ client_id: CLIENT_ID, callback: async (r: any) => {
        try { const d = await call('/auth/google', 'POST', { credential: r.credential }); login(d.token, ''); } catch (e: any) { toast(e.message); }
      } });
      g.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', width: 300, text: 'continue_with', shape: 'pill' });
    };
    if ((window as any).google) init();
    else { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = init; document.head.appendChild(s); }
  }, []); // eslint-disable-line
  if (!CLIENT_ID) return null;
  return <div className="gwrap"><div ref={box} /><div className="or"><span>or use a code</span></div></div>;
}
