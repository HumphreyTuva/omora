import { Controller, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtGuard } from '../auth/guards';
@Controller('wishlist') @UseGuards(JwtGuard)
export class WishlistController {
  constructor(private db: PrismaService) {}
  @Get() async list(@Req() req: any) {
    const rows = await this.db.wishlistItem.findMany({ where: { userId: req.user.id }, orderBy: { id: 'desc' }, include: { product: { include: { seller: { select: { storeName: true } }, images: { select: { url: true }, take: 1 } } } } });
    return rows.map(r => r.product).filter(p => p.status === 'LIVE');
  }
  // Tap the heart once to save, again to remove.
  @Post(':productId') async toggle(@Req() req: any, @Param('productId') productId: string) {
    if (!(await this.db.product.findUnique({ where: { id: productId } }))) throw new NotFoundException('Product not found');
    const key = { userId_productId: { userId: req.user.id, productId } };
    if (await this.db.wishlistItem.findUnique({ where: key })) { await this.db.wishlistItem.delete({ where: key }); return { saved: false }; }
    await this.db.wishlistItem.create({ data: { userId: req.user.id, productId } });
    return { saved: true };
  }
}
