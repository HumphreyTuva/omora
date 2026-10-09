import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma.service';
import { EmailService, SmsService } from '../notifications/notifications.service';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const isEmail = (t: string) => t.includes('@');
// "target" is either a phone number or an email address.
@Injectable()
export class AuthService {
  constructor(private db: PrismaService, private jwt: JwtService, private sms: SmsService, private email: EmailService) {}
  private async session(user: any) {
    return { token: await this.jwt.signAsync({ sub: user.id, role: user.role }), user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role } };
  }
  async requestOtp(target: string) {
    const recent = await this.db.otp.count({ where: { target, createdAt: { gt: new Date(Date.now() - 60_000) } } });
    if (recent >= 1) throw new BadRequestException('Wait 60 seconds before requesting another code');
    const code = String(randomInt(100000, 999999));
    await this.db.otp.create({ data: { target, codeHash: hash(code), expiresAt: new Date(Date.now() + 5 * 60_000) } });
    const msg = `Your Omora code is ${code}. It expires in 5 minutes.`;
    if (isEmail(target)) await this.email.send(target, 'Your Omora sign-in code', msg); else await this.sms.send(target, msg);
    return { sent: true };
  }
  async verifyOtp(target: string, code: string) {
    const otp = await this.db.otp.findFirst({ where: { target, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!otp || otp.attempts >= 5) throw new BadRequestException('Code expired. Request a new one');
    if (otp.codeHash !== hash(code)) {
      await this.db.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Incorrect code');
    }
    await this.db.otp.deleteMany({ where: { target } });
    const user = isEmail(target)
      ? await this.db.user.upsert({ where: { email: target }, update: {}, create: { email: target } })
      : await this.db.user.upsert({ where: { phone: target }, update: {}, create: { phone: target } });
    return this.session(user);
  }
  // Google sign-in: the browser sends a signed ID token. We ask Google to check it, make sure it was issued for OUR app
  // and the email is verified, then find or create the account by email (same account as an email-code sign-in).
  async googleSignIn(credential: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new BadRequestException('Google sign-in is not set up yet');
    const fail = new BadRequestException('Google sign-in failed. Please try again.');
    let g: any;
    try { const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential)); if (!r.ok) throw fail; g = await r.json(); } catch { throw fail; }
    const okIssuer = ['accounts.google.com', 'https://accounts.google.com'].includes(g.iss);
    if (g.aud !== clientId || !okIssuer || g.email_verified !== 'true' || !g.email) throw fail;
    const email = String(g.email).toLowerCase();
    const user = await this.db.user.upsert({ where: { email }, update: {}, create: { email, name: g.name || null } });
    return this.session(user);
  }
}
