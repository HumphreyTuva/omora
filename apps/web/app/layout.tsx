import './globals.css';
import { Provider } from './store';
import Shell from './Shell';
export const metadata = { title: 'Omora — All-in-One Marketplace', description: 'Everything You Need. Connected.', icons: { icon: '/logo-dark.png' } };
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
export default async function Root({ children }: { children: React.ReactNode }) {
  const cats = await fetch(API + '/categories', { cache: 'no-store' }).then(r => r.json()).catch(() => []);
  return <html lang="en"><body><Provider><Shell cats={Array.isArray(cats) ? cats : []} />{children}</Provider></body></html>;
}
