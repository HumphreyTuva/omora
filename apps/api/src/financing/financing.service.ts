import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
// The pay-later decision, used by the admin screen and by the financing partner's own portal. Every decision records who made it and when.
@Injectable()
export class FinancingService {
  constructor(private db: PrismaService, private n: NotificationsService) {}
  private async waiting(id: string, include: any) {
    const o: any = await this.db.order.findUnique({ where: { id }, include });
    if (!o || !o.financed || o.status !== 'AWAITING_FINANCING') throw new BadRequestException('This order is not waiting for a financing decision');
    return o;
  }
  async approve(id: string, reference: string | undefined, actorId: string) {
    const o = await this.waiting(id, { items: { include: { seller: { select: { userId: true } } } } });
    await this.db.$transaction([
      this.db.order.update({ where: { id }, data: { status: 'PAID', financeStatus: 'APPROVED', financeRef: reference?.trim() || null, financeDecidedBy: actorId, financeDecidedAt: new Date() } }),
      this.db.orderItem.updateMany({ where: { orderId: id, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' } }),
    ]);
    const ref = id.slice(-8).toUpperCase();
    await this.n.notify(o.customerId, 'Financing approved', `Baadae approved your pay-later order #${ref}. The seller is preparing it.`, '/orders', true);
    for (const uid of new Set<string>(o.items.map((i: any) => i.seller.userId as string))) await this.n.notify(uid, 'New order', `You have a new paid order #${ref} to confirm.`, '/seller');
    await this.n.notifyAdmins('Pay-later approved', `Order #${ref} was approved. Remember to record Baadae's payment when it arrives.`, '/admin');
    return { ok: true };
  }
  // Declined: the goods go back on sale and the order becomes a refund request, so the deposit is returned through the normal refund screen.
  async decline(id: string, actorId: string) {
    const o = await this.waiting(id, { items: true });
    await this.db.$transaction([
      ...o.items.map((i: any) => this.db.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } })),
      this.db.orderItem.updateMany({ where: { orderId: id }, data: { status: 'CANCELLED' } }),
      this.db.order.update({ where: { id }, data: { status: 'REFUND_REQUESTED', financeStatus: 'DECLINED', refundReason: 'Pay-later application declined: refund the deposit.', financeDecidedBy: actorId, financeDecidedAt: new Date() } }),
    ]);
    const ref = id.slice(-8).toUpperCase();
    await this.n.notify(o.customerId, 'Financing not approved', `Baadae could not approve order #${ref}. Your deposit will be refunded. You can still buy the item by paying in full.`, '/orders', true);
    await this.n.notifyAdmins('Pay-later declined', `Order #${ref} was declined. Refund the deposit in Admin, Refunds.`, '/admin', true);
    return { ok: true };
  }
}
