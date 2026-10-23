import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { JwtGuard } from '../auth/guards';
import { RateLimit } from '../common/rate-limit';
class ReviewDto { @IsString() productId: string; @IsString() orderId: string; @IsInt() @Min(1) @Max(5) rating: number; @IsOptional() @IsString() comment?: string; }
@Controller('reviews')
export class ReviewsController {
  constructor(private db: PrismaService) {}
  @Get() list(@Query('productId') productId: string) {
    return this.db.review.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, rating: true, comment: true, createdAt: true } });
  }
  // Only verified purchasers: the order must be theirs and the item delivered.
  @Post() @UseGuards(JwtGuard) @RateLimit(20, 600) async create(@Req() req: any, @Body() b: ReviewDto) {
    const item = await this.db.orderItem.findFirst({ where: { orderId: b.orderId, productId: b.productId, status: 'DELIVERED', order: { customerId: req.user.id } } });
    if (!item) throw new BadRequestException('You can review a product after it has been delivered to you');
    if (await this.db.review.findFirst({ where: { userId: req.user.id, productId: b.productId, orderId: b.orderId } })) throw new BadRequestException('You already reviewed this product');
    const p = await this.db.product.findUniqueOrThrow({ where: { id: b.productId } });
    const count = p.reviewCount + 1, rating = Math.round(((p.rating * p.reviewCount + b.rating) / count) * 10) / 10;
    await this.db.$transaction([
      this.db.review.create({ data: { userId: req.user.id, productId: b.productId, orderId: b.orderId, rating: b.rating, comment: b.comment } }),
      this.db.product.update({ where: { id: b.productId }, data: { rating, reviewCount: count } }),
    ]);
    return { ok: true };
  }
}
