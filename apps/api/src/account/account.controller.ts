import { BadRequestException, Body, Controller, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { JwtGuard } from '../auth/guards';
import { RateLimit } from '../common/rate-limit';
import { EmailService, SmsService } from '../notifications/notifications.service';
class DeleteDto { @IsIn(['DELETE']) confirm: string; }
// Orders that are paid for and not finished yet: an account with these cannot be deleted until they are settled.
const IN_PROGRESS = ['PAID', 'SELLER_CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'AWAITING_FINANCING', 'REFUND_REQUESTED', 'DISPUTED'];
@Controller('account') @UseGuards(JwtGuard)
export class AccountController {
  constructor(private db: PrismaService, private email: EmailService, private sms: SmsService) {}
  // Customers delete their own account. Personal details are removed; order and payment records stay (without personal details) for accounting.
  @Post('delete') @RateLimit(5, 3600) async remove(@Req() req: any, @Body() _b: DeleteDto) {
    const u: any = await this.db.user.findUnique({ where: { id: req.user.id }, include: { seller: true } });
    if (!u || u.deletedAt) throw new NotFoundException();
    if (u.role !== 'CUSTOMER') throw new BadRequestException('Staff accounts can only be removed by the Omora administrator.');
    if (u.seller) throw new BadRequestException('To close a seller account, please contact support so open orders and payouts can be settled first.');
    const open = await this.db.order.count({ where: { customerId: u.id, status: { in: IN_PROGRESS as any } } });
    if (open) throw new BadRequestException('You have orders in progress. You can delete your account once they are delivered or resolved, or contact support.');
    const unpaid: any[] = await this.db.order.findMany({ where: { customerId: u.id, status: 'PENDING_PAYMENT' }, include: { items: true } });
    const unpaidIds = unpaid.map(o => o.id);
    const contacts = [u.phone, u.email].filter(Boolean) as string[];
    await this.db.$transaction([
      // unpaid orders are cancelled and the stock goes back on sale
      ...unpaid.flatMap(o => o.items.map((i: any) => this.db.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } }))),
      this.db.orderItem.updateMany({ where: { orderId: { in: unpaidIds } }, data: { status: 'CANCELLED' } }),
      this.db.order.updateMany({ where: { id: { in: unpaidIds } }, data: { status: 'CANCELLED' } }),
      this.db.order.updateMany({ where: { customerId: u.id }, data: { deliveryName: null, deliveryPhone: null, deliveryArea: null, deliveryAddress: null, deliveryNotes: null } }),
      this.db.notification.deleteMany({ where: { userId: u.id } }),
      this.db.wishlistItem.deleteMany({ where: { userId: u.id } }),
      this.db.review.updateMany({ where: { userId: u.id }, data: { comment: null } }),
      this.db.otp.deleteMany({ where: { target: { in: contacts } } }),
      this.db.user.update({ where: { id: u.id }, data: { name: null, phone: null, email: null, passwordHash: null, deletedAt: new Date() } }),
    ]);
    // A last message to the old contact details so the person knows it really happened.
    const msg = 'Your Omora account has been deleted and your personal details removed. If this was not you, contact support right away.';
    if (u.email) await this.email.send(u.email, 'Your Omora account was deleted', msg);
    else if (u.phone) await this.sms.send(u.phone, 'Omora: ' + msg);
    return { deleted: true };
  }
}
