// Turns any common way of writing a Kenyan mobile number into +2547XXXXXXXX / +2541XXXXXXXX. Returns null if it isn't one.
// Accepts: 0712345678, 0112 345 678, 254712345678, +254 712 345 678, 07-123-45678, 712345678, 00254712345678
export function normalizePhone(raw: string): string | null {
  let d = String(raw ?? '').replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('00')) d = d.slice(2);
  if (!/^\d+$/.test(d)) return null;
  if (d.startsWith('254')) d = d.slice(3); else if (d.startsWith('0')) d = d.slice(1);
  return /^[17]\d{8}$/.test(d) ? '+254' + d : null;
}
