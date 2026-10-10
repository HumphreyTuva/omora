'use client';
import ProductImage from '../ProductImage';
import { useEffect, useState } from 'react';
import { call, useStore } from '../store';
import Heart from '../Heart';
const money = (n: number) => 'KSh ' + n.toLocaleString('en-KE');
export default function Wishlist() {
  const { token, setPanel, add, wish } = useStore();
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => { if (token) call('/wishlist', 'GET', undefined, token).then(setList).catch(() => setList([])); }, [token]);
  if (!token) return <main className="wrap"><div className="empty">Sign in to see the items you saved.<br /><br /><button className="btn" onClick={() => setPanel('login')}>Sign in</button></div></main>;
  const shown = (list || []).filter(p => wish.includes(p.id)); // hearts tapped here disappear immediately
  return (<main className="wrap"><div className="h"><h2>My Wishlist</h2></div>
    {list && !shown.length && <div className="empty">Nothing saved yet. Tap ♡ on any product.<br /><br /><a className="btn" href="/#products">Browse products</a></div>}
    <div className="grid">{shown.map(p => { const price = p.salePrice ?? p.price; return (
      <article className="card" key={p.id}><Heart id={p.id} />
        <a href={`/products/${p.id}`}><div className="pic"><ProductImage src={p.images?.[0]?.url} emoji={p.emoji} alt={p.name} /></div><h3>{p.name}</h3></a>
        <div className="price">{money(price)}{p.salePrice && <s>{money(p.price)}</s>}</div><div className="sell">{p.seller.storeName} <b>✔</b></div>
        <button className="add" onClick={() => add({ id: p.id, name: p.name, emoji: p.emoji, image: p.images?.[0]?.url, price })}>🛒 Add to Cart</button></article>); })}</div></main>);
}
