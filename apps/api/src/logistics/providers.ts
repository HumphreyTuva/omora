// Every delivery company implements this same interface, so Omora can switch or add providers without touching the marketplace.
export interface LogisticsProvider {
  name: string;
  getQuote(subtotal: number): number;
  createShipment(orderId: string): Promise<{ trackingNumber: string }>;
  trackShipment(trackingNumber: string): Promise<string | null>; // external providers: poll their API here
  cancelShipment(trackingNumber: string): Promise<void>;
}
class OmoraLogistics implements LogisticsProvider {
  name = 'OMORA';
  getQuote(subtotal: number) { return subtotal >= 20000 ? 0 : 350; } // TODO: distance/weight based pricing
  async createShipment(orderId: string) { return { trackingNumber: 'OM' + orderId.slice(-6).toUpperCase() + Date.now().toString(36).toUpperCase().slice(-4) }; }
  async trackShipment() { return null; } // status is managed by Omora staff in the admin Logistics tab
  async cancelShipment() {}
}
export const providers: Record<string, LogisticsProvider> = { OMORA: new OmoraLogistics() };
export const quoteDelivery = (subtotal: number) => providers.OMORA.getQuote(subtotal);
