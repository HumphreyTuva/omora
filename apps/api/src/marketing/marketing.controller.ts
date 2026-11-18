import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { JwtGuard, Roles } from '../auth/guards';
import { RateLimit } from '../common/rate-limit';
import { MarketingService } from './marketing.service';
class PrefsDto { @IsOptional() @IsBoolean() email?: boolean; @IsOptional() @IsBoolean() sms?: boolean; @IsOptional() @IsBoolean() whatsapp?: boolean; }
class PromoDto {
  @IsString() @Length(3, 120) title: string;
  @IsString() @Length(3, 600) body: string;
  @IsOptional() @IsUrl({ require_protocol: true, protocols: ['https'] }) linkUrl?: string;
  @IsOptional() @IsString() @Length(1, 30) linkLabel?: string;
  @IsArray() @ArrayMinSize(1) @IsIn(['EMAIL', 'SMS'], { each: true }) channels: string[];
}
@Controller()
export class MarketingController {
  constructor(private m: MarketingService, private db: PrismaService) {}
  // ---- a person's own choices ----
  @Get('account/preferences') @UseGuards(JwtGuard) prefs(@Req() req: any) { return this.m.prefs(req.user.id); }
  @Put('account/preferences') @UseGuards(JwtGuard) @RateLimit(30, 3600) setPrefs(@Req() req: any, @Body() b: PrefsDto) { return this.m.setPrefs(req.user.id, b); }
  // ---- the link at the bottom of every promotion (free and needs no sign-in) ----
  @Post('marketing/unsubscribe') @RateLimit(30, 3600) unsubscribe(@Body() b: { token?: string }) { return this.m.unsubscribe(String(b?.token || '')); }
  // ---- admin ----
  @Get('admin/promotions') @UseGuards(JwtGuard) @Roles('ADMIN') list() { return this.db.promotion.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }); }
  @Get('admin/promotions/audience') @UseGuards(JwtGuard) @Roles('ADMIN') audience() { return this.m.audience(); }
  @Get('admin/promotions/whatsapp-list') @UseGuards(JwtGuard) @Roles('ADMIN') whatsappList() { return this.m.whatsappList(); }
  @Post('admin/promotions/test') @UseGuards(JwtGuard) @Roles('ADMIN') @RateLimit(20, 3600) test(@Req() req: any, @Body() b: PromoDto) { return this.m.sendTest(req.user.id, b, b.channels); }
  @Post('admin/promotions') @UseGuards(JwtGuard) @Roles('ADMIN') @RateLimit(10, 3600) create(@Req() req: any, @Body() b: PromoDto) { return this.m.create(req.user.id, b, b.channels); }
  @Post('admin/promotions/:id/resume') @UseGuards(JwtGuard) @Roles('ADMIN') @RateLimit(10, 3600) async resume(@Param('id') id: string) { this.m.run(id).catch(e => console.error(e)); return { ok: true }; }
}
