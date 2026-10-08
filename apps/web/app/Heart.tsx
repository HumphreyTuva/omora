'use client';
import { useStore } from './store';
export default function Heart({ id }: { id: string }) {
  const { wish, toggleWish } = useStore(); const on = wish.includes(id);
  return <button className={'heart' + (on ? ' on' : '')} onClick={e => { e.preventDefault(); toggleWish(id); }} aria-pressed={on} aria-label={on ? 'Remove from wishlist' : 'Save to wishlist'}>{on ? '♥' : '♡'}</button>;
}
