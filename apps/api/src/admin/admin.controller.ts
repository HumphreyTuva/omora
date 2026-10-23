import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Req, UseGuards, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';
import { SettingsService } from '../settings/settings.service';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { NotificationsService, SmsService } from '../notifications/notifications.service';
import { JwtGuard, Roles } from '../auth/guards';
class NewProduct { @IsString() name: string; @IsString() categoryId: string; @IsString() description: string; @IsInt() @Min(1) price: number; @IsInt() @Min(0) stock: number; }
class DeliverySettings { @IsInt() @Min(0) @Max(100000) deliveryFee: number; @IsInt() @Min(0) @Max(10000000) freeAbove: number; }
class EditProduct {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @Length(0, 2000) description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100000000) price?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100000000) salePrice?: number | null; // null removes the sale price
  @IsOptional() @IsInt() @Min(0) @Max(1000000) stock?: number;
}

@Controller() @UseGuards(JwtGuard)
export class AdminController {
  constructor(private db: PrismaService, private n: NotificationsService, private storage: StorageService, private appSettings: SettingsService) {}
  // Seller submits a product: goes to PENDING_REVIEW, never straight to LIVE.
  @Post('seller/products') @Roles('SELLER') async addProduct(@Req() req: any, @Body() b: NewProduct) {
    const seller = await this.db.seller.findUnique({ where: { userId: req.user.id } });
    if (!seller || seller.status !== 'VERIFIED') throw new BadRequestException('Your store must be verified before listing products');
    return this.db.product.create({ data: { ...b, sellerId: seller.id, status: 'PENDING_REVIEW' } });
  }
  private async mySeller(userId: string) {
    const s = await this.db.seller.findUnique({ where: { userId } });
    if (!s) throw new ForbiddenException('No seller account'); return s;
  }
  // Up to 5 photos per product. The file is checked (type, real image header, 3 MB) before it is stored.
  @Post('seller/products/:id/images') @Roles('SELLER') @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 3 * 1024 * 1024 } }))
  async addImage(@Req() req: any, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Choose an image');
    const s = await this.mySeller(req.user.id);
    const p = await this.db.product.findFirst({ where: { id, sellerId: s.id }, include: { images: true } });
    if (!p || p.status === 'ARCHIVED') throw new NotFoundException();
    if (p.images.length >= 5) throw new BadRequestException('Maximum 5 images per product');
    const url = await this.storage.saveImage(file);
    const img = await this.db.productImage.create({ data: { productId: id, url } });
    if (p.status === 'LIVE' || p.status === 'APPROVED') await this.db.product.update({ where: { id }, data: { status: 'PENDING_REVIEW' } }); // new photos need approval too
    return img;
  }
  @Get('seller/products/:id') @Roles('SELLER') async sellerProduct(@Req() req: any, @Param('id') id: string) {
    const s = await this.mySeller(req.user.id);
    const p = await this.db.product.findFirst({ where: { id, sellerId: s.id, status: { not: 'ARCHIVED' } }, include: { images: { select: { id: true, url: true }, orderBy: { id: 'asc' } } } });
    if (!p) throw new NotFoundException(); return p;
  }
  // Price, sale price and stock change straight away. Changing the name, description or category (or adding photos) sends a live
  // product back for admin approval, so a listing can't be swapped for something else after it was approved. Rejected products are resubmitted.
  @Patch('seller/products/:id') @Roles('SELLER') async editProduct(@Req() req: any, @Param('id') id: string, @Body() b: EditProduct) {
    const s = await this.mySeller(req.user.id);
    const p = await this.db.product.findFirst({ where: { id, sellerId: s.id, status: { not: 'ARCHIVED' } } });
    if (!p) throw new NotFoundException();
    if (b.categoryId && !(await this.db.category.findUnique({ where: { id: b.categoryId } }))) throw new BadRequestException('Choose a valid category');
    const price = b.price ?? p.price, sale = b.salePrice !== undefined ? b.salePrice : p.salePrice;
    if (sale != null && sale >= price) throw new BadRequestException('The sale price must be lower than the normal price');
    const sensitive = (b.name !== undefined && b.name !== p.name) || (b.description !== undefined && b.description !== p.description) || (b.categoryId !== undefined && b.categoryId !== p.categoryId);
    let status = p.status;
    if ((p.status === 'LIVE' || p.status === 'APPROVED') && sensitive) status = 'PENDING_REVIEW';
    if (p.status === 'REJECTED') status = 'PENDING_REVIEW';
    const updated = await this.db.product.update({ where: { id }, data: { name: b.name?.trim(), categoryId: b.categoryId, description: b.description, price: b.price, salePrice: b.salePrice, stock: b.stock, status } });
    return { ...updated, sentForReview: status !== p.status };
  }
  @Delete('seller/products/:id/images/:imageId') @Roles('SELLER') async removeImage(@Req() req: any, @Param('id') id: string, @Param('imageId') imageId: string) {
    const s = await this.mySeller(req.user.id);
    const img = await this.db.productImage.findFirst({ where: { id: imageId, productId: id, product: { sellerId: s.id } } });
    if (!img) throw new NotFoundException();
    await this.db.productImage.delete({ where: { id: imageId } });
    await this.storage.deleteImage(img.url);
    return { removed: true };
  }
  // A product nobody has ordered is deleted completely. One with order history is archived instead (hidden everywhere), so past orders stay intact.
  @Delete('seller/products/:id') @Roles('SELLER') async deleteProduct(@Req() req: any, @Param('id') id: string) {
    const s = await this.mySeller(req.user.id);
    const p = await this.db.product.findFirst({ where: { id, sellerId: s.id, status: { not: 'ARCHIVED' } }, include: { images: true, _count: { select: { items: true } } } });
    if (!p) throw new NotFoundException();
    if (p._count.items > 0) { await this.db.product.update({ where: { id }, data: { status: 'ARCHIVED', stock: 0 } }); return { deleted: true, archived: true }; }
    await this.db.$transaction([this.db.wishlistItem.deleteMany({ where: { productId: id } }), this.db.productImage.deleteMany({ where: { productId: id } }), this.db.product.delete({ where: { id } })]);
    for (const img of p.images) await this.storage.deleteImage(img.url);
    return { deleted: true };
  }
  @Get('seller/orders') @Roles('SELLER') async sellerOrders(@Req() req: any) {
    const s = await this.mySeller(req.user.id);
    return this.db.orderItem.findMany({ where: { sellerId: s.id, status: { not: 'PENDING_PAYMENT' } }, orderBy: { order: { createdAt: 'desc' } }, include: { product: { select: { name: true, emoji: true } }, order: { select: { id: true, createdAt: true, deliveryArea: true } } } });
  }
  @Get('seller/products') @Roles('SELLER') async sellerProducts(@Req() req: any) {
    const s = await this.mySeller(req.user.id);
    return this.db.product.findMany({ where: { sellerId: s.id, status: { not: 'ARCHIVED' } }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, emoji: true, price: true, stock: true, status: true, images: { select: { url: true }, take: 1 } } });
  }
  // Earnings: delivered = available, paid-but-not-delivered = pending. Commission already stored per item.
  @Get('seller/earnings') @Roles('SELLER') async earnings(@Req() req: any) {
    const s = await this.mySeller(req.user.id);
    const items = await this.db.orderItem.findMany({ where: { sellerId: s.id } });
    const net = (i: any) => i.price * i.quantity - i.commission;
    const pend = ['PAID', 'SELLER_CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
    const sum = (f: (i: any) => boolean, g: (i: any) => number) => items.filter(f).reduce((a, i) => a + g(i), 0);
    const out = (await this.db.sellerPayout.aggregate({ _sum: { amount: true }, where: { sellerId: s.id, status: { in: ['PENDING', 'PAID'] } } }))._sum.amount ?? 0;
    return { available: sum(i => i.status === 'DELIVERED', net) - out, pending: sum(i => pend.includes(i.status), net),
      sales: sum(i => i.status !== 'PENDING_PAYMENT' && i.status !== 'CANCELLED', i => i.price * i.quantity), commission: sum(i => i.status === 'DELIVERED', i => i.commission),
      orders: items.filter(i => i.status === 'PAID').length };
  }
  @Get('admin/sellers') @Roles('ADMIN') sellers() { return this.db.seller.findMany({ orderBy: { status: 'asc' }, include: { user: { select: { phone: true } }, _count: { select: { products: true } } } }); }
  @Get('admin/products/pending') @Roles('ADMIN') pendingProducts() { return this.db.product.findMany({ where: { status: 'PENDING_REVIEW' }, include: { seller: { select: { storeName: true } }, category: { select: { name: true } }, images: { select: { url: true }, take: 1 } } }); }
  @Get('admin/orders') @Roles('ADMIN') orders() { return this.db.order.findMany({ take: 50, orderBy: { createdAt: 'desc' }, include: { customer: { select: { phone: true } }, items: { select: { id: true, status: true } } } }); }
  @Patch('admin/sellers/:id/reject') @Roles('ADMIN') rejectSeller(@Param('id') id: string) { return this.db.seller.update({ where: { id }, data: { status: 'REJECTED' } }); }
  @Patch('admin/sellers/:id/suspend') @Roles('ADMIN') suspendSeller(@Param('id') id: string) { return this.db.seller.update({ where: { id }, data: { status: 'SUSPENDED' } }); }
  @Patch('admin/products/:id/reject') @Roles('ADMIN') rejectProduct(@Param('id') id: string) { return this.db.product.update({ where: { id }, data: { status: 'REJECTED' } }); }
  @Post('seller/payouts') @Roles('SELLER') async requestPayout(@Req() req: any) {
    const { available } = await this.earnings(req);
    if (available < 500) throw new BadRequestException('Minimum payout is KSh 500');
    const s = await this.mySeller(req.user.id);
    return this.db.sellerPayout.create({ data: { sellerId: s.id, amount: available } });
  }
  @Get('admin/payouts') @Roles('ADMIN') payouts() { return this.db.sellerPayout.findMany({ orderBy: { status: 'asc' }, take: 50, include: { seller: { select: { storeName: true, user: { select: { phone: true } } } } } }); }
  // Admin sends the money (e.g. M-Pesa) and records the reference here. Automated payouts come later.
  @Patch('admin/payouts/:id/paid') @Roles('ADMIN') async markPaid(@Param('id') id: string, @Body() b: { reference?: string }) {
    const p = await this.db.sellerPayout.update({ where: { id }, data: { status: 'PAID', reference: b?.reference || 'MANUAL' }, include: { seller: { select: { userId: true } } } });
    await this.n.notify(p.seller.userId, 'Payout sent', `KSh ${p.amount.toLocaleString('en-KE')} has been sent to you. Ref ${p.reference}.`, '/seller', true);
    return p;
  }
  @Get('admin/refunds') @Roles('ADMIN') refunds() { return this.db.order.findMany({ where: { status: 'REFUND_REQUESTED' }, orderBy: { createdAt: 'desc' }, include: { customer: { select: { phone: true } }, items: { select: { status: true } } } }); }
  // Approving: admin sends the money back (e.g. M-Pesa) and records it here. Items become REFUNDED, so seller earnings are reduced.
  @Patch('admin/refunds/:id/approve') @Roles('ADMIN') async approveRefund(@Param('id') id: string) {
    const o = await this.db.$transaction(async tx => {
      await tx.orderItem.updateMany({ where: { orderId: id }, data: { status: 'REFUNDED' } });
      await tx.payment.updateMany({ where: { orderId: id, status: 'SUCCESS' }, data: { status: 'REFUNDED' } });
      return tx.order.update({ where: { id }, data: { status: 'REFUNDED' } });
    });
    await this.n.notify(o.customerId, 'Refund processed', `Your refund of KSh ${o.total.toLocaleString('en-KE')} has been sent.`, '/orders', true);
    return o;
  }
  @Patch('admin/refunds/:id/reject') @Roles('ADMIN') async rejectRefund(@Param('id') id: string) {
    const items = await this.db.orderItem.findMany({ where: { orderId: id } });
    if (!items.some(i => i.status === 'DELIVERED')) throw new BadRequestException('Cancelled paid orders must be refunded');
    return this.db.order.update({ where: { id }, data: { status: 'DELIVERED' } });
  }
  @Get('admin/commissions') @Roles('ADMIN') commissions() { return this.db.category.findMany({ select: { id: true, name: true, commissionRate: true }, orderBy: { name: 'asc' } }); }
  // Applies to new orders only: commission is stored on each order item when it is placed.
  @Patch('admin/commissions/:id') @Roles('ADMIN') setCommission(@Param('id') id: string, @Body() b: { rate: number }) {
    const r = Number(b?.rate); if (!(r >= 0 && r <= 0.5)) throw new BadRequestException('Commission must be between 0% and 50%');
    return this.db.category.update({ where: { id }, data: { commissionRate: r } });
  }
  @Get('admin/coupons') @Roles('ADMIN') coupons() { return this.db.coupon.findMany({ orderBy: { id: 'desc' } }); }
  @Post('admin/coupons') @Roles('ADMIN') async newCoupon(@Body() b: any) {
    const code = String(b.code || '').trim().toUpperCase(), pct = +b.percentOff || null, amt = +b.amountOff || null;
    if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new BadRequestException('Code must be 3–20 letters or numbers');
    if (!pct === !amt) throw new BadRequestException('Set either a percentage or a fixed amount');
    if (pct && (pct < 1 || pct > 90)) throw new BadRequestException('Percentage must be between 1 and 90');
    try { return await this.db.coupon.create({ data: { code, percentOff: pct, amountOff: amt, minSpend: +b.minSpend || 0, maxUses: +b.maxUses || null, expiresAt: +b.days ? new Date(Date.now() + +b.days * 86400000) : null } }); }
    catch { throw new BadRequestException('That code already exists'); }
  }
  @Patch('admin/coupons/:id/toggle') @Roles('ADMIN') async toggleCoupon(@Param('id') id: string) {
    const c = await this.db.coupon.findUnique({ where: { id } }); if (!c) throw new NotFoundException();
    return this.db.coupon.update({ where: { id }, data: { active: !c.active } });
  }
  @Get('admin/settings') @Roles('ADMIN') getSettings() { return this.appSettings.delivery(); }
  @Patch('admin/settings') @Roles('ADMIN') async setSettings(@Body() b: DeliverySettings) { await this.appSettings.setDelivery(b.deliveryFee, b.freeAbove); return this.appSettings.delivery(); }
  @Get('admin/overview') @Roles('ADMIN') async overview() {
    const [orders, customers, sellers, pendingSellers, pendingProducts, gmv] = await Promise.all([
      this.db.order.count(), this.db.user.count({ where: { role: 'CUSTOMER' } }), this.db.seller.count(),
      this.db.seller.count({ where: { status: 'PENDING_VERIFICATION' } }), this.db.product.count({ where: { status: 'PENDING_REVIEW' } }),
      this.db.order.aggregate({ _sum: { total: true }, where: { status: { not: 'PENDING_PAYMENT' } } })]);
    return { gmv: gmv._sum.total ?? 0, orders, customers, sellers, pendingSellers, pendingProducts };
  }
  @Patch('admin/sellers/:id/verify') @Roles('ADMIN') verify(@Param('id') id: string) { return this.db.seller.update({ where: { id }, data: { status: 'VERIFIED' } }); }
  @Patch('admin/products/:id/approve') @Roles('ADMIN') async approve(@Param('id') id: string) {
    try { return await this.db.product.update({ where: { id }, data: { status: 'LIVE' } }); } catch { throw new NotFoundException(); }
  }
}
