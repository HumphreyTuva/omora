// Explicit order state machine: only these transitions are allowed.
export const TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['SELLER_CONFIRMED', 'CANCELLED', 'REFUND_REQUESTED'],
  SELLER_CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['PICKED_UP'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['REFUND_REQUESTED', 'RETURNED', 'DISPUTED'],
  REFUND_REQUESTED: ['REFUNDED', 'DISPUTED'],
  DISPUTED: ['REFUNDED', 'DELIVERED'],
  RETURNED: ['REFUNDED'], CANCELLED: [], REFUNDED: [],
};
export const canMove = (from: string, to: string) => TRANSITIONS[from]?.includes(to) ?? false;
// Statuses a seller may set (logistics/admin handle the rest).
export const SELLER_STATUSES = ['SELLER_CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'CANCELLED'];
