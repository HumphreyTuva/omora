import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { NotificationsService, SmsService } from '../notifications/notifications.service';
import { JwtGuard, Roles } from '../auth/guards';
import { quoteDelivery } from '../logistics/providers';
import { validateCoupon } from '../coupons/coupons.controller';
import { SELLER_STATUSES, canMove } from './state';
class Line { @IsString() productId: string; @IsInt() @Min(1) @Max(20) quantity: number; }
class CreateOrder { @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => Line) items: Line[]; @IsOptional() @IsString() coupon?: string; }
class ReasonDto { @IsString() @Length(3, 300) reason: string; }
const CUSTOMER_CANCELLABLE = ['PENDING_PAYMENT', 'PAID', 'SELLER_CONFIRMED'];
class StatusDto { @IsIn(SELLER_STATUSES) status: string; }
const deliveryFee = quoteDelivery;

@Controller('orders') @UseGuards(JwtGuard)
export class OrdersController {
  constructor(private db: PrismaService, private n: NotificationsService) {}

  // One checkout, many sellers: every line becomes an OrderItem tagged with its seller + commission.
  @Post() async create(@Req() req: any, @Body() dto: CreateOrder) {
    return this.db.$transaction(async tx => {
      const ids = [...new Set(dto.items.map(i => i.productId))];
      const products = await tx.product.findMany({ where: { id: { in: ids }, status: 'LIVE' }, include: { category: true, seller: true } });
      if (products.length !== ids.length) throw new BadRequestException('A product in your cart is no longer available');
      let subtotal = 0; const items: any[] = [];
      for (const l of dto.items) {
        const p = products.find(x => x.id === l.productId)!;
        // Atomic stock reservation: fails if someone else bought the last unit.
        const r = await tx.product.updateMany({ where: { id: p.id, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
        if (!r.count) throw new BadRequestException(`Not enough stock for ${p.name}`);
        const price = p.salePrice ?? p.price, rate = p.seller.commissionOverride ?? p.category.commissionRate;
        subtotal += price * l.quantity;
        items.push({ productId: p.id, sellerId: p.sellerId, quantity: l.quantity, price, commission: Math.round(price * l.quantity * rate) });
      }
      const fee = deliveryFee(subtotal); let discount = 0, couponCode: string | undefined;
      if (dto.coupon) {
        const v = await validateCoupon(tx, dto.coupon, subtotal); discount = v.discount; couponCode = v.coupon.code;
        const u = await tx.coupon.updateMany({ where: { id: v.coupon.id, ...(v.coupon.maxUses != null ? { used: { lt: v.coupon.maxUses } } : {}) }, data: { used: { increment: 1 } } });
        if (!u.count) throw new BadRequestException('This coupon has been fully used');
      }
      return tx.order.create({ data: { customerId: req.user.id, total: subtotal - discount + fee, deliveryFee: fee, discount, couponCode, items: { create: items } }, include: { items: true } });
    });
  }
  @Get() mine(@Req() req: any) { return this.db.order.findMany({ where: { customerId: req.user.id }, orderBy: { createdAt: 'desc' }, include: { items: { include: { product: { select: { name: true, emoji: true } }, seller: { select: { storeName: true } } } } } }); }
  @Get(':id') async one(@Req() req: any, @Param('id') id: string) {
    const o = await this.db.order.findUnique({ where: { id }, include: { items: true, payments: true } });
    if (!o || (o.customerId !== req.user.id && req.user.role !== 'ADMIN')) throw new NotFoundException();
    return o;
  }
  // Customer cancels before the seller starts processing. Stock goes back on the shelf; a paid order becomes a refund request.
  @Post(':id/cancel') async cancel(@Req() req: any, @Param('id') id: string) {
    return this.db.$transaction(async tx => {
      const o = await tx.order.findUnique({ where: { id }, include: { items: true, payments: true } });
      if (!o || o.customerId !== req.user.id) throw new NotFoundException();
      if (!o.items.every(i => CUSTOMER_CANCELLABLE.includes(i.status))) throw new BadRequestException('This order is already being prepared or shipped. Once delivered you can request a refund.');
      for (const i of o.items) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
      await tx.orderItem.updateMany({ where: { orderId: id }, data: { status: 'CANCELLED' } });
      const paid = o.payments.some(p => p.status === 'SUCCESS');
      return tx.order.update({ where: { id }, data: { status: paid ? 'REFUND_REQUESTED' : 'CANCELLED' } });
    });
  }
  @Post(':id/refund-request') async refund(@Req() req: any, @Param('id') id: string, @Body() b: ReasonDto) {
    const o = await this.db.order.findUnique({ where: { id }, include: { items: true } });
    if (!o || o.customerId !== req.user.id) throw new NotFoundException();
    if (!o.items.some(i => i.status === 'DELIVERED') || ['REFUND_REQUESTED', 'REFUNDED'].includes(o.status)) throw new BadRequestException('A refund can only be requested for a delivered order');
    return this.db.order.update({ where: { id }, data: { status: 'REFUND_REQUESTED', refundReason: b.reason } });
  }
  // Seller updates only their own line items, and only along allowed transitions.
  @Patch('items/:id/status') @Roles('SELLER') async sellerStatus(@Req() req: any, @Param('id') id: string, @Body() dto: StatusDto) {
    const seller = await this.db.seller.findUnique({ where: { userId: req.user.id } });
    const item = await this.db.orderItem.findUnique({ where: { id }, include: { order: { select: { id: true, customerId: true } } } });
    if (!item || !seller || item.sellerId !== seller.id) throw new ForbiddenException();
    if (!canMove(item.status, dto.status)) throw new BadRequestException(`Cannot move from ${item.status} to ${dto.status}`);
    const u = await this.db.orderItem.update({ where: { id }, data: { status: dto.status as any } });
    const T: Record<string, string> = { SELLER_CONFIRMED: 'Seller confirmed your order', PROCESSING: 'Your order is being prepared', READY_FOR_PICKUP: 'Your order is ready for courier pickup', CANCELLED: 'The seller cancelled an item in your order' };
    await this.n.notify(item.order.customerId, T[dto.status], `Order #${item.order.id.slice(-8).toUpperCase()}`, `/track/${item.order.id}`);
    return u;
  }
}
