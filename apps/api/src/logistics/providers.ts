// Every delivery company implements this same interface, so Omora can switch or add providers without touching the marketplace.
export interface LogisticsProvider {
  name: string;
  getQuote(subtotal: number): number;
  createShipment(orderId: string): Promise<{ trackingNumber: string }>;
  trackShipment(trackingNumber: string): Promise<string | null>; // external providers: poll their API here
  cancelShipment(trackingNumber: string): Promise<void>;
}
// Delivery price is a setting, not code: DELIVERY_FEE (KSh, default 350) and FREE_DELIVERY_ABOVE (KSh, default 20000; 0 = never free).
const envInt = (key: string, fallback: number) => { const v = process.env[key]; const n = v === undefined || v.trim() === '' ? NaN : Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback; };
export const deliveryConfig = () => ({ deliveryFee: envInt('DELIVERY_FEE', 350), freeAbove: envInt('FREE_DELIVERY_ABOVE', 20000) });
class OmoraLogistics implements LogisticsProvider {
  name = 'OMORA';
  getQuote(subtotal: number) { const c = deliveryConfig(); return c.freeAbove > 0 && subtotal >= c.freeAbove ? 0 : c.deliveryFee; } // TODO: distance/weight based pricing
  async createShipment(orderId: string) { return { trackingNumber: 'OM' + orderId.slice(-6).toUpperCase() + Date.now().toString(36).toUpperCase().slice(-4) }; }
  async trackShipment() { return null; } // status is managed by Omora staff in the admin Logistics tab
  async cancelShipment() {}
}
export const providers: Record<string, LogisticsProvider> = { OMORA: new OmoraLogistics() };
export const quoteDelivery = (subtotal: number) => providers.OMORA.getQuote(subtotal);
