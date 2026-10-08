'use client';
import { useStore } from './store';
export default function AddButton({ p }: { p: { id: string; name: string; emoji?: string; image?: string; price: number } }) {
  const { add } = useStore();
  return <button className="add" onClick={() => add(p)}>🛒 Add to Cart</button>;
}
