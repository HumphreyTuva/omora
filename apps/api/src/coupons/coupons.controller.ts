import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
export async function validateCoupon(db: any, raw: string, subtotal: number) {
  const code = (raw || '').trim().toUpperCase();
  const c = await db.coupon.findUnique({ where: { code } });
  if (!c || !c.active) throw new BadRequestException('That coupon code is not valid');
  if (c.expiresAt && c.expiresAt < new Date()) throw new BadRequestException('This coupon has expired');
  if (c.maxUses != null && c.used >= c.maxUses) throw new BadRequestException('This coupon has been fully used');
  if (subtotal < c.minSpend) throw new BadRequestException(`Spend at least KSh ${c.minSpend.toLocaleString('en-KE')} to use this coupon`);
  const d = c.percentOff ? Math.round((subtotal * c.percentOff) / 100) : c.amountOff || 0;
  return { coupon: c, discount: Math.min(d, subtotal) };
}
@Controller('coupons')
export class CouponsController {
  constructor(private db: PrismaService) {}
  @Get('check') async check(@Query('code') code: string, @Query('subtotal') subtotal: string) {
    const { coupon, discount } = await validateCoupon(this.db, code, +subtotal || 0);
    return { code: coupon.code, discount };
  }
}
