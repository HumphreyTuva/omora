import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtGuard, Roles } from '../auth/guards';
import { RateLimit } from '../common/rate-limit';
import { FinancingService } from './financing.service';
// The financing partner's (Baadae's) own view. It shows ONLY pay-later orders whose customer agreed to share their details,
// and only what the partner needs to assess the application: no delivery address, no seller information, no other orders.
@Controller('partner') @UseGuards(JwtGuard)
export class PartnerController {
  constructor(private db: PrismaService, private fin: FinancingService) {}
  @Get('applications') @Roles('FINANCING_PARTNER', 'ADMIN') async list() {
    const orders: any[] = await this.db.order.findMany({
      where: { financed: true, financeConsentAt: { not: null }, financeStatus: { not: null }, createdAt: { gt: new Date(Date.now() - 90 * 86400_000) } },
      orderBy: { createdAt: 'desc' }, take: 150,
      include: { items: { include: { product: { select: { name: true } } } }, customer: { select: { email: true } } },
    });
    return orders.map(o => ({
      id: o.id, ref: o.id.slice(-8).toUpperCase(), createdAt: o.createdAt, consentAt: o.financeConsentAt,
      customerName: o.deliveryName, customerPhone: o.deliveryPhone, customerEmail: o.customer?.email || null, area: o.deliveryArea,
      items: o.items.map((i: any) => ({ name: i.product.name, quantity: i.quantity, price: i.price })),
      goodsTotal: o.items.reduce((a: number, i: any) => a + i.price * i.quantity, 0), deposit: o.depositAmount, financeAmount: o.financeAmount,
      status: o.financeStatus, reference: o.financeRef, decidedAt: o.financeDecidedAt,
    }));
  }
  @Patch('applications/:id/approve') @Roles('FINANCING_PARTNER', 'ADMIN') @RateLimit(60, 600) approve(@Req() req: any, @Param('id') id: string, @Body() b: { reference?: string }) { return this.fin.approve(id, b?.reference, req.user.id); }
  @Patch('applications/:id/decline') @Roles('FINANCING_PARTNER', 'ADMIN') @RateLimit(60, 600) decline(@Req() req: any, @Param('id') id: string) { return this.fin.decline(id, req.user.id); }
}
