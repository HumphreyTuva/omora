import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
const sorts: Record<string, any> = { cheapest: { price: 'asc' }, expensive: { price: 'desc' }, rated: { rating: 'desc' }, newest: { createdAt: 'desc' }, popular: { reviewCount: 'desc' } };
@Controller()
export class CatalogController {
  constructor(private db: PrismaService) {}
  @Get('categories') categories() { return this.db.category.findMany({ select: { id: true, name: true, slug: true, icon: true }, orderBy: { name: 'asc' } }); }
  @Get('products')
  async products(@Query('q') q?: string, @Query('category') category?: string, @Query('sort') sort?: string, @Query('page') page = '1', @Query('limit') limit = '20', @Query('minPrice') minPrice?: string, @Query('maxPrice') maxPrice?: string, @Query('minRating') minRating?: string, @Query('inStock') inStock?: string) {
    const take = Math.min(+limit || 20, 50), skip = (Math.max(+page, 1) - 1) * take;
    const where: any = { status: 'LIVE' };
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { seller: { storeName: { contains: q, mode: 'insensitive' } } }];
    if (category) where.category = { slug: category };
    const range: any = {}; if (+minPrice) range.gte = +minPrice; if (+maxPrice) range.lte = +maxPrice;
    if (range.gte || range.lte) where.AND = [{ OR: [{ salePrice: range }, { salePrice: null, price: range }] }]; // matches the price the customer actually pays
    if (+minRating) where.rating = { gte: +minRating };
    if (inStock === '1') where.stock = { gt: 0 };
    const [items, total] = await Promise.all([
      this.db.product.findMany({ where, take, skip, orderBy: sorts[sort || ''] || { reviewCount: 'desc' }, include: { category: { select: { name: true, slug: true } }, seller: { select: { id: true, storeName: true } }, images: { select: { url: true }, take: 1 } } }),
      this.db.product.count({ where }),
    ]);
    return { items, total, page: +page, pages: Math.ceil(total / take) };
  }
  @Get('products/:id') async product(@Param('id') id: string) {
    const p = await this.db.product.findFirst({ where: { id, status: 'LIVE' }, include: { images: true, category: true, seller: { select: { id: true, storeName: true, rating: true } } } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }
}
