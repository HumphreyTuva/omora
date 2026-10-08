import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { NotificationsService, SmsService } from '../notifications/notifications.service';
import { JwtGuard, Roles } from '../auth/guards';
import { providers } from './providers';
const NEXT: Record<string, string> = { CREATED: 'PICKED_UP', PICKED_UP: 'IN_TRANSIT', IN_TRANSIT: 'OUT_FOR_DELIVERY', OUT_FOR_DELIVERY: 'DELIVERED' };
const TITLES: Record<string, string> = { PICKED_UP: 'Picked up by our courier', IN_TRANSIT: 'Your order is on its way', OUT_FOR_DELIVERY: 'Out for delivery today', DELIVERED: 'Your order was delivered' };
const DONE = ['CANCELLED', 'REFUNDED'];
class CreateDto { @IsString() orderId: string; }
class AdvanceDto { @IsString() status: string; @IsOptional() @IsString() note?: string; }
@Controller('logistics') @UseGuards(JwtGuard)
export class LogisticsController {
  constructor(private db: PrismaService, private n: NotificationsService) {}
  // Orders where every live item is READY_FOR_PICKUP and no shipment exists yet (one shipment per order for now).
  @Get('ready') @Roles('ADMIN', 'LOGISTICS_AGENT') async ready() {
    const orders = await this.db.order.findMany({ where: { shipments: { none: {} }, items: { some: { status: 'READY_FOR_PICKUP' } } }, include: { items: { select: { status: true } }, customer: { select: { phone: true } } } });
    return orders.filter(o => o.items.filter(i => !DONE.includes(i.status)).every(i => i.status === 'READY_FOR_PICKUP'));
  }
  @Get('shipments') @Roles('ADMIN', 'LOGISTICS_AGENT') shipments() { return this.db.shipment.findMany({ where: { status: { not: 'DELIVERED' } }, orderBy: { createdAt: 'desc' } }); }
  @Post('shipments') @Roles('ADMIN', 'LOGISTICS_AGENT') async create(@Body() b: CreateDto) {
    const o = await this.db.order.findUnique({ where: { id: b.orderId }, include: { items: true, shipments: true } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.shipments.length) throw new BadRequestException('A shipment already exists for this order');
    const live = o.items.filter(i => !DONE.includes(i.status));
    if (!live.length || !live.every(i => i.status === 'READY_FOR_PICKUP')) throw new BadRequestException('Every seller must mark their items ready for pickup first');
    const p = providers.OMORA, { trackingNumber } = await p.createShipment(o.id);
    return this.db.shipment.create({ data: { orderId: o.id, provider: p.name, trackingNumber, events: { create: { status: 'CREATED', note: 'Shipment created' } } } });
  }
  // One step at a time, in order. Moves the order's items and the order status along with the shipment.
  @Patch('shipments/:id') @Roles('ADMIN', 'LOGISTICS_AGENT') async advance(@Param('id') id: string, @Body() b: AdvanceDto) {
    const done = await this.db.$transaction(async tx => {
      const s = await tx.shipment.findUnique({ where: { id } });
      if (!s) throw new NotFoundException();
      if (NEXT[s.status] !== b.status) throw new BadRequestException(`Next step must be ${NEXT[s.status] || 'none (already delivered)'}`);
      await tx.shipmentEvent.create({ data: { shipmentId: id, status: b.status, note: b.note } });
      await tx.orderItem.updateMany({ where: { orderId: s.orderId, status: { notIn: ['CANCELLED', 'REFUNDED'] as any } }, data: { status: b.status as any } });
      await tx.order.update({ where: { id: s.orderId }, data: { status: b.status as any } });
      return tx.shipment.update({ where: { id }, data: { status: b.status } });
    });
    const o = await this.db.order.findUnique({ where: { id: done.orderId }, select: { customerId: true } });
    if (o) await this.n.notify(o.customerId, TITLES[b.status], `Order #${done.orderId.slice(-8).toUpperCase()}`, `/track/${done.orderId}`, ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(b.status));
    return done;
  }
  @Get('track/:orderId') async track(@Req() req: any, @Param('orderId') orderId: string) {
    const o = await this.db.order.findUnique({ where: { id: orderId }, include: { items: { select: { status: true } }, shipments: { include: { events: { orderBy: { createdAt: 'asc' } } } } } });
    if (!o || (o.customerId !== req.user.id && !['ADMIN', 'LOGISTICS_AGENT'].includes(req.user.role))) throw new NotFoundException();
    return o;
  }
}
