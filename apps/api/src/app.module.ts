import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { CatalogController } from './catalog/catalog.controller';
import { OrdersController } from './orders/orders.controller';
import { PaymentsController } from './payments/payments.controller';
import { MpesaService } from './payments/mpesa.service';
import { SellersController } from './auth/sellers.controller';
import { ReviewsController } from './reviews/reviews.controller';
import { WishlistController } from './wishlist/wishlist.controller';
import { CouponsController } from './coupons/coupons.controller';
import { LogisticsController } from './logistics/logistics.controller';
import { StorageService } from './storage/storage.service';
import { SettingsService } from './settings/settings.service';
import { EmailService, NotificationsService, SmsService } from './notifications/notifications.service';
import { NotificationsController } from './notifications/notifications.controller';
import { AdminController } from './admin/admin.controller';
@Global()
@Module({
  imports: [JwtModule.register({ global: true, secret: process.env.JWT_SECRET || 'dev-secret', signOptions: { expiresIn: '7d' } })],
  controllers: [AuthController, CatalogController, OrdersController, PaymentsController, AdminController, SellersController, ReviewsController, WishlistController, CouponsController, LogisticsController, NotificationsController],
  providers: [PrismaService, AuthService, MpesaService, SmsService, EmailService, NotificationsService, StorageService, SettingsService],
  exports: [PrismaService, SmsService, EmailService, NotificationsService, StorageService, SettingsService],
})
export class AppModule {}
