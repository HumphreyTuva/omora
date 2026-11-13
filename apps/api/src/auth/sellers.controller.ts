import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { JwtService } from '@nestjs/jwt';
import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsIn, IsString, Length, Matches } from 'class-validator';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma.service';
import { JwtGuard } from './guards';
import { RateLimit } from '../common/rate-limit';
import { normalizePhone } from '../common/phone';
import { EmailService, NotificationsService, SmsService } from '../notifications/notifications.service';
import { AGREEMENT_VERSION, PLANS, SECTIONS, renderAgreement } from '../sellers/agreement';
const KINDS = ['ID_FRONT', 'ID_BACK', 'PASSPORT', 'KRA', 'BUSINESS_REG'];
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
class ApplicationDto {
  @IsString() @Length(2, 80) storeName: string;
  @IsString() @Length(2, 120) legalName: string;
  @IsString() @Length(2, 80) contactPerson: string;
  @IsIn(['NATIONAL_ID', 'PASSPORT']) idType: string;
  @IsString() @Length(4, 30) idNumber: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)) @Matches(/^[A-Z]\d{9}[A-Z]$/, { message: 'Enter a valid KRA PIN, e.g. A123456789Z' }) kraPin: string;
  @IsString() @Length(5, 200) address: string;
  @IsString() @Length(2, 60) county: string;
  @Transform(({ value }) => (typeof value === 'string' ? normalizePhone(value) ?? value : value)) @Matches(/^\+254[17]\d{8}$/, { message: 'Enter a valid Kenyan phone number, e.g. 0712 345 678' }) phone: string;
  @IsEmail() email: string;
  @IsString() @Length(3, 300) categories: string;
  @IsIn(['STARTER', 'BUSINESS', 'PREMIUM']) plan: string;
  @IsString() @Length(2, 80) signedName: string;
  @IsString() @Length(2, 60) signedTitle: string;
  @Equals(true, { message: 'You must accept the agreement to continue' }) agree: boolean;
  @IsString() @Length(6, 6) code: string;
}
@Controller('sellers')
export class SellersController {
  constructor(private db: PrismaService, private jwt: JwtService, private email: EmailService, private sms: SmsService, private n: NotificationsService, private storage: StorageService) {}

  // Public: the agreement text and plans (the website fills in the seller's details and shows it).
  @Get('agreement') agreement() { return { version: AGREEMENT_VERSION, plans: PLANS, sections: SECTIONS }; }

  @Get('application') @UseGuards(JwtGuard) async mine(@Req() req: any) {
    const s: any = await this.db.seller.findUnique({ where: { userId: req.user.id }, include: { application: true } });
    return s?.application || {};
  }

  // ---- Identity documents (ID / passport, KRA certificate, business registration). Stored privately; shown only to the owner and to admins. ----
  @Post('documents') @UseGuards(JwtGuard) @RateLimit(30, 3600) @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 6 * 1024 * 1024 } }))
  async upload(@Req() req: any, @UploadedFile() file: any, @Body() b: any) {
    const kind = String(b?.kind || '');
    if (!KINDS.includes(kind)) throw new BadRequestException('Unknown document type');
    if (!file) throw new BadRequestException('Choose a file');
    const s: any = await this.db.seller.findUnique({ where: { userId: req.user.id }, include: { application: true } });
    if (s?.application) throw new BadRequestException('Your application has already been submitted');
    const key = await this.storage.savePrivate(file, 'seller-docs/' + req.user.id);
    const old: any[] = await this.db.sellerDocument.findMany({ where: { userId: req.user.id, applicationId: null, kind } });
    const doc: any = await this.db.sellerDocument.create({ data: { userId: req.user.id, kind, storageKey: key, mime: file.mimetype, size: file.size } });
    for (const o of old) { await this.db.sellerDocument.delete({ where: { id: o.id } }); await this.storage.deletePrivate(o.storageKey); }
    return { id: doc.id, kind: doc.kind, mime: doc.mime };
  }
  @Get('documents') @UseGuards(JwtGuard) mineDocs(@Req() req: any) { return this.db.sellerDocument.findMany({ where: { userId: req.user.id }, select: { id: true, kind: true, mime: true, createdAt: true, applicationId: true }, orderBy: { createdAt: 'asc' } }); }
  @Get('documents/:id') @UseGuards(JwtGuard) async docFile(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const d: any = await this.db.sellerDocument.findFirst({ where: { id, userId: req.user.id } });
    if (!d) throw new NotFoundException();
    res.set({ 'Content-Type': d.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }); res.send(await this.storage.readPrivate(d.storageKey));
  }
  @Delete('documents/:id') @UseGuards(JwtGuard) async docRemove(@Req() req: any, @Param('id') id: string) {
    const d: any = await this.db.sellerDocument.findFirst({ where: { id, userId: req.user.id, applicationId: null } });
    if (!d) throw new NotFoundException();
    await this.db.sellerDocument.delete({ where: { id } }); await this.storage.deletePrivate(d.storageKey); return { ok: true };
  }

  // A one-time code, sent to the email or phone on the account, that the seller must type to sign. It ties the signature to a verified identity.
  @Post('sign-code') @UseGuards(JwtGuard) @RateLimit(5, 3600) async signCode(@Req() req: any) {
    const u: any = await this.db.user.findUnique({ where: { id: req.user.id } });
    if (!u) throw new NotFoundException();
    const target = 'sign:' + u.id;
    if (await this.db.otp.count({ where: { target, createdAt: { gt: new Date(Date.now() - 60_000) } } })) throw new BadRequestException('Wait 60 seconds before requesting another code');
    const code = String(randomInt(100000, 999999));
    await this.db.otp.create({ data: { target, codeHash: hash(code), expiresAt: new Date(Date.now() + 10 * 60_000) } });
    const msg = `Your Omora code to sign the seller agreement is ${code}. It expires in 10 minutes. Never share it.`;
    if (u.email) {
      if (!(await this.email.send(u.email, 'Sign your Omora seller agreement', msg))) throw new BadRequestException('We could not send the email right now. Please try again.');
      return { sent: true, to: u.email.replace(/^(.).*(@.*)$/, '$1***$2') };
    }
    if (u.phone) { await this.sms.send(u.phone, msg); return { sent: true, to: u.phone.slice(0, 6) + '•••' + u.phone.slice(-3) }; }
    throw new BadRequestException('Add an email address or phone number to your account first');
  }

  // Business details + plan + electronic acceptance. Creates the seller (waiting for verification) or attaches the agreement to an existing seller.
  @Post('application') @UseGuards(JwtGuard) @RateLimit(5, 3600) async submit(@Req() req: any, @Body() b: ApplicationDto) {
    const u: any = await this.db.user.findUnique({ where: { id: req.user.id }, include: { seller: { include: { application: true } } } });
    if (!u) throw new NotFoundException();
    if (u.role !== 'CUSTOMER' && u.role !== 'SELLER') throw new BadRequestException('This account cannot apply as a seller');
    if (u.seller?.application) throw new BadRequestException('You have already submitted your application');
    // The ID must be uploaded (so the number typed above can be checked against it).
    const docs: any[] = await this.db.sellerDocument.findMany({ where: { userId: u.id, applicationId: null } });
    const have = (k: string) => docs.some(d => d.kind === k);
    if (b.idType === 'PASSPORT' ? !have('PASSPORT') : !(have('ID_FRONT') && have('ID_BACK'))) throw new BadRequestException(b.idType === 'PASSPORT' ? 'Please upload the photo page of your passport' : 'Please upload the front and back of your national ID');
    const target = 'sign:' + u.id;
    const otp = await this.db.otp.findFirst({ where: { target, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!otp || otp.attempts >= 5) throw new BadRequestException('Your signing code has expired. Please request a new one.');
    if (otp.codeHash !== hash(b.code)) { await this.db.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } }); throw new BadRequestException('Incorrect code'); }
    await this.db.otp.deleteMany({ where: { target } });
    const plan = PLANS.find(p => p.id === b.plan)!, now = new Date();
    const vars: Record<string, string> = {
      date: now.toISOString().slice(0, 10), legalName: b.legalName.trim(), idNumber: b.idNumber.trim(), kraPin: b.kraPin, address: `${b.address.trim()}, ${b.county.trim()}`,
      tradingName: b.storeName.trim(), representative: b.signedName.trim(), position: b.signedTitle.trim(), contact: `${b.email} / ${b.phone}`, location: b.county.trim(),
      planName: plan.name, registration: String(plan.registration), monthly: plan.monthly.toLocaleString('en-KE'), commission: String(plan.commission),
    };
    const text = renderAgreement(vars) + `\n\nAccepted electronically by ${vars.representative}, ${vars.position}, on ${now.toISOString()} (confirmed with a one-time code sent to the account's contact).`;
    const app = await this.db.$transaction(async tx => {
      let sellerId: string = u.seller?.id;
      if (!sellerId) {
        sellerId = (await tx.seller.create({ data: { userId: u.id, storeName: b.storeName.trim() } })).id;
        await tx.user.update({ where: { id: u.id }, data: { role: 'SELLER' } });
      }
      const created = await tx.sellerApplication.create({ data: {
        sellerId, idType: b.idType, legalName: b.legalName.trim(), idNumber: b.idNumber.trim(), kraPin: b.kraPin, address: b.address.trim(), county: b.county.trim(), phone: b.phone, email: b.email.trim().toLowerCase(),
        contactPerson: b.contactPerson.trim(), categories: b.categories.trim(), plan: b.plan, agreementVersion: AGREEMENT_VERSION, agreementText: text,
        signedName: vars.representative, signedTitle: vars.position, signedAt: now, signedIp: req.ip, signedUserAgent: String(req.headers['user-agent'] || '').slice(0, 300) } });
      await tx.sellerDocument.updateMany({ where: { userId: u.id, applicationId: null }, data: { applicationId: created.id } });
      return created;
    });
    await this.n.notifyAdmins('New seller application', `${b.storeName.trim()} (${plan.name} plan) signed the agreement. Review it in Admin, Applications.`, '/admin', true);
    await this.n.notify(u.id, 'Application received', 'Thanks! Omora will review your application and agreement and let you know.', '/seller');
    return { token: await this.jwt.signAsync({ sub: u.id, role: 'SELLER' }), applicationId: app.id };
  }
}
