import ProductImage from '../../ProductImage';
import AddButton from '../../AddButton';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const money = (n: number) => 'KSh ' + n.toLocaleString('en-KE');
export default async function ProductPage({ params }: { params: { id: string } }) {
  const r = await fetch(`${API}/products/${params.id}`, { cache: 'no-store' }).catch(() => null);
  if (!r || !r.ok) return <main className="wrap"><div className="empty">This product is no longer available. <a href="/"><b>Back to shop</b></a></div></main>;
  const p = await r.json(); const reviews: any[] = await fetch(`${API}/reviews?productId=${p.id}`, { cache: 'no-store' }).then(x => x.json()).catch(() => []); const price = p.salePrice ?? p.price;
  return (<main className="wrap pdp">
    <a className="back" href={`/?category=${p.category.slug}#products`}>‹ {p.category.name}</a>
    <div className="pd">
      <div><div className="pic big"><ProductImage src={p.images?.[0]?.url} emoji={p.emoji} alt={p.name} />{p.badge && <b className="badge">{p.badge}</b>}</div>{p.images?.length > 1 && <div className="thumbs">{p.images.map((i: any) => <img key={i.id} src={i.url} alt="" />)}</div>}</div>
      <div className="info">
        <h1>{p.name}</h1>
        <div className="meta"><span className="s">★ {p.rating}</span><span>{p.reviewCount.toLocaleString()} reviews</span><span className="st">● {p.stock > 0 ? 'In Stock' : 'Out of stock'}</span></div>
        <div className="price big">{money(price)}{p.salePrice && <s>{money(p.price)}</s>}</div>
        <div className="sellerbox"><div><b>{p.seller.storeName} <span style={{ color: '#1d9bf0' }}>✔</span></b><small>Verified seller · ★ {p.seller.rating}</small></div></div>
        <ul className="perks"><li>🚚 Delivery from KSh 350 (free from KSh 20,000)</li><li>🛡 Omora Protected — buy with confidence</li><li>↩ Easy returns within 7 days</li></ul>
        {p.description && <p className="desc">{p.description}</p>}
        {p.stock > 0 ? <AddButton p={{ id: p.id, name: p.name, emoji: p.emoji, image: p.images?.[0]?.url, price }} /> : <button className="add" disabled>Out of stock</button>}
      </div>
    </div>
    <section className="reviews"><h2>Customer reviews</h2>{reviews.length ? reviews.map((v: any) => <div className="rv" key={v.id}><b>{'★'.repeat(v.rating)}{'☆'.repeat(5 - v.rating)}</b> <small>Verified buyer · {new Date(v.createdAt).toLocaleDateString('en-KE')}</small>{v.comment && <p>{v.comment}</p>}</div>) : <p style={{ color: '#6b6b6b' }}>No written reviews yet. Only customers who received this product can review it.</p>}</section>
  </main>);
}
