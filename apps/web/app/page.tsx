import Heart from './Heart';
import Hero from './Hero';
import AddButton from './AddButton';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
type Product = { id: string; name: string; emoji?: string; images?: { url: string }[]; price: number; salePrice?: number | null; rating: number; badge?: string | null; seller: { storeName: string } };
type Category = { id: string; name: string; slug: string; icon?: string };
const money = (n: number) => 'KSh ' + n.toLocaleString('en-KE');
async function get<T>(path: string, fallback: T): Promise<T> {
  try { const r = await fetch(API + path, { cache: 'no-store' }); return r.ok ? await r.json() : fallback; } catch { return fallback; }
}
export default async function Home({ searchParams }: { searchParams: { q?: string; category?: string; sort?: string; minPrice?: string; maxPrice?: string; minRating?: string; inStock?: string } }) {
  const qs = new URLSearchParams(searchParams as Record<string, string>).toString();
  const [cats, data] = await Promise.all([get<Category[]>('/categories', []), get<{ items: Product[] }>('/products?' + qs, { items: [] })]);
  return (<>
    <main>
      <Hero />
      <section className="wrap"><div className="h"><h2>Shop by Category</h2></div>
        <div className="catgrid">{cats.map(c => <a key={c.id} className={'cat' + (searchParams.category === c.slug ? ' on' : '')} href={`/?category=${c.slug}#products`}><span>{c.icon}</span>{c.name}</a>)}</div></section>
      <section className="wrap" id="products"><div className="h"><h2>{searchParams.q ? `Results for “${searchParams.q}”` : 'Featured Products'}</h2></div>
        <form className="filters" action="/#products">
          {searchParams.q && <input type="hidden" name="q" defaultValue={searchParams.q} />}{searchParams.category && <input type="hidden" name="category" defaultValue={searchParams.category} />}
          <label>Sort<select name="sort" defaultValue={searchParams.sort || ''}><option value="">Most popular</option><option value="cheapest">Price: low to high</option><option value="expensive">Price: high to low</option><option value="rated">Highest rated</option><option value="newest">Newest</option></select></label>
          <label>Min price (KSh)<input name="minPrice" type="number" min={0} defaultValue={searchParams.minPrice} /></label>
          <label>Max price (KSh)<input name="maxPrice" type="number" min={0} defaultValue={searchParams.maxPrice} /></label>
          <label>Rating<select name="minRating" defaultValue={searchParams.minRating || ''}><option value="">Any</option><option value="4">4★ &amp; up</option><option value="4.5">4.5★ &amp; up</option></select></label>
          <label className="chk"><input type="checkbox" name="inStock" value="1" defaultChecked={searchParams.inStock === '1'} /> In stock only</label>
          <button className="btn sm">Apply</button><a className="clear" href="/#products">Clear</a>
        </form>
        <div className="grid">{data.items.length ? data.items.map(p => (
          <article className="card" key={p.id}>{p.badge && <span className="badge">{p.badge}</span>}<Heart id={p.id} />
            <a href={`/products/${p.id}`}><div className="pic">{p.images?.[0] ? <img src={p.images[0].url} alt={p.name} loading="lazy" /> : <span>{p.emoji}</span>}</div><h3>{p.name}</h3></a>
            <div className="meta"><span className="s">★ {p.rating}</span><span className="st">● In Stock</span></div>
            <div className="price">{money(p.salePrice ?? p.price)}{p.salePrice && <s>{money(p.price)}</s>}</div>
            <div className="sell">{p.seller.storeName} <b>✔</b></div><AddButton p={{ id: p.id, name: p.name, emoji: p.emoji, image: p.images?.[0]?.url, price: p.salePrice ?? p.price }} /></article>
        )) : <div className="empty">No products yet. Is the API running? (see README)</div>}</div></section>

      <section className="wrap promos">
        <a className="promo p1" href="/?category=electronics#products"><div><small>UP TO 50% OFF</small><h3>Tech Deals</h3><p>Get the latest gadgets at unbeatable prices.</p><span className="btn">Shop Now ›</span></div><i>💻📱🎧</i></a>
        <a className="promo p2" href="/?category=fashion#products"><div><small>FASHION</small><h3>FOR EVERY YOU</h3><p>Style. Quality. Affordable.</p><span className="btn">Explore Now ›</span></div><i>👗🕶️👟</i></a>
      </section>
      <section className="trust"><div>🛡<b>100% Genuine</b><small>Products</small></div><div>💳<b>Secure Payments</b><small>M-Pesa, Cards, etc.</small></div><div>🚚<b>Fast &amp; Reliable</b><small>Delivery</small></div><div>↩<b>Easy Returns</b><small>Within 7 Days</small></div></section>
    </main>
  </>);
}
