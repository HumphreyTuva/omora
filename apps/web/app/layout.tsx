import './globals.css';
import { Provider } from './store';
import Shell from './Shell';
import Footer from './Footer';
import PwaRegister from './PwaRegister';
export const metadata = { title: 'Omora — All-in-One Marketplace', description: 'Everything You Need. Connected.', manifest: '/manifest.webmanifest', icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' }, appleWebApp: { capable: true, title: 'Omora', statusBarStyle: 'black-translucent' } };
export const viewport = { themeColor: '#0a0a0a' };
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
export default async function Root({ children }: { children: React.ReactNode }) {
  const cats = await fetch(API + '/categories', { cache: 'no-store' }).then(r => r.json()).catch(() => []);
  return <html lang="en"><body><PwaRegister /><Provider><Shell cats={Array.isArray(cats) ? cats : []} />{children}<Footer /></Provider></body></html>;
}
