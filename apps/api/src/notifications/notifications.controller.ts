import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtGuard } from '../auth/guards';
@Controller('notifications') @UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private db: PrismaService) {}
  @Get() async list(@Req() req: any) {
    const [items, unread] = await Promise.all([
      this.db.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.db.notification.count({ where: { userId: req.user.id, read: false } })]);
    return { items, unread };
  }
  @Post('read-all') async readAll(@Req() req: any) { await this.db.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } }); return { ok: true }; }
}
