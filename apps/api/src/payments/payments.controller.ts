import { BadRequestException, Body, Controller, ForbiddenException, HttpCode, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { NotificationsService, SmsService } from '../notifications/notifications.service';
import { JwtGuard } from '../auth/guards';
import { MpesaService } from './mpesa.service';
class InitDto { @IsString() orderId: string; @Matches(/^\+254[17]\d{8}$/, { message: 'Use format +2547XXXXXXXX' }) phone: string; }
const ACK = { ResultCode: 0, ResultDesc: 'Accepted' }; // always answer 200 so Safaricom doesn't keep retrying

@Controller('payments')
export class PaymentsController {
  constructor(private db: PrismaService, private mpesa: MpesaService, private n: NotificationsService) {}

  @Post('initiate') @UseGuards(JwtGuard) async initiate(@Req() req: any, @Body() b: InitDto) {
    const order = await this.db.order.findUnique({ where: { id: b.orderId } });
    if (!order || order.customerId !== req.user.id) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING_PAYMENT') throw new BadRequestException('Order is not awaiting payment');
    const reference = await this.mpesa.stkPush(b.phone, order.total, order.id);
    const payment = await this.db.payment.create({ data: { orderId: order.id, provider: 'MPESA', amount: order.total, reference } });
    return { paymentId: payment.id, message: 'Check your phone and enter your M-Pesa PIN' };
  }

  // Safaricom calls this. Three checks before an order is marked paid: the secret in the URL, the amount, and a direct confirmation from Safaricom.
  @Post('callback') @HttpCode(200) async callback(@Query('secret') secret: string, @Body() body: any) {
    const expected = process.env.MPESA_CALLBACK_SECRET;
    if (process.env.MPESA_MODE === 'live' && (!expected || secret !== expected)) { console.error('M-Pesa callback rejected: bad or missing secret'); return ACK; }
    const cb = body?.Body?.stkCallback;
    if (!cb) return ACK;
    const payment = await this.db.payment.findFirst({ where: { reference: cb.CheckoutRequestID, status: 'PENDING' } });
    if (!payment) return ACK;
    if (cb.ResultCode === 0) {
      const amount = Number(cb.CallbackMetadata?.Item?.find((i: any) => i.Name === 'Amount')?.Value);
      const q = await this.mpesa.stkQuery(cb.CheckoutRequestID);
      if (amount === payment.amount && q.resultCode === 0) await this.settle(payment.id, true);
    } else await this.settle(payment.id, false);
    return ACK;
  }

  // The website calls this after the customer pays, so a missed or delayed callback (e.g. a sleeping free server) never leaves a paid order stuck.
  @Post('verify/:orderId') @UseGuards(JwtGuard) async verify(@Req() req: any, @Param('orderId') orderId: string) {
    const order = await this.db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order || order.customerId !== req.user.id) throw new NotFoundException();
    if (order.status !== 'PENDING_PAYMENT') return { paid: order.status !== 'CANCELLED' };
    for (const p of order.payments.filter(x => x.status === 'PENDING' && x.reference)) {
      const q = await this.mpesa.stkQuery(p.reference!);
      if (q.resultCode === 0) { await this.settle(p.id, true); return { paid: true }; }
      if (q.resultCode !== null) await this.settle(p.id, false);
    }
    return { paid: false };
  }

  // Local testing only (MPESA_MODE=mock): simulates the customer approving the prompt.
  @Post('dev/confirm/:id') @UseGuards(JwtGuard) async devConfirm(@Param('id') id: string) {
    if (process.env.MPESA_MODE === 'live') throw new ForbiddenException();
    await this.settle(id, true); return { ok: true };
  }

  // Safe to call twice: only a PENDING payment can be settled, once.
  private async settle(paymentId: string, ok: boolean) {
    const done = await this.db.$transaction(async tx => {
      const claim = await tx.payment.updateMany({ where: { id: paymentId, status: 'PENDING' }, data: { status: ok ? 'SUCCESS' : 'FAILED', completedAt: new Date() } });
      if (!claim.count) return null;
      const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (ok) {
        await tx.order.updateMany({ where: { id: p.orderId, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' } });
        await tx.orderItem.updateMany({ where: { orderId: p.orderId, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' } });
      }
      return p;
    });
    if (done && ok) await this.notifyPaid(done.orderId);
  }
  private async notifyPaid(orderId: string) {
    const o = await this.db.order.findUnique({ where: { id: orderId }, include: { items: { include: { seller: { select: { userId: true } } } } } });
    if (!o) return; const ref = orderId.slice(-8).toUpperCase();
    await this.n.notify(o.customerId, 'Payment received', `Your order #${ref} is confirmed.`, '/orders', true);
    for (const uid of new Set<string>(o.items.map((i: any) => i.seller.userId as string))) await this.n.notify(uid, 'New order', `You have a new paid order #${ref} to confirm.`, '/seller');
  }
}
