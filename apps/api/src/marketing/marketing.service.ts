import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { EmailService, SmsService } from '../notifications/notifications.service';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const webUrl = () => (process.env.WEB_PUBLIC_URL || (process.env.WEB_ORIGIN || '').split(',')[0] || 'http://localhost:3000').trim().replace(/\/$/, '');
export type Promo = { title: string; body: string; linkUrl?: string | null; linkLabel?: string | null };
// Offers and news. Consent first: a person is only ever contacted on a channel they ticked, every message carries a free one-click
// unsubscribe, and unsubscribing switches all marketing off. Order updates and sign-in codes are not marketing and are unaffected.
@Injectable()
export class MarketingService {
  constructor(private db: PrismaService, private email: EmailService, private sms: SmsService) {}
  private newToken() { return randomBytes(9).toString('base64url'); }
  private async tokenFor(u: { id: string; unsubToken?: string | null }) { if (u.unsubToken) return u.unsubToken; const t = this.newToken(); await this.db.user.update({ where: { id: u.id }, data: { unsubToken: t } }); return t; }

  async prefs(userId: string) {
    const u: any = await this.db.user.findUnique({ where: { id: userId } });
    return { hasEmail: !!u?.email, hasPhone: !!u?.phone, email: !!u?.marketingEmail, sms: !!u?.marketingSms, whatsapp: !!u?.marketingWhatsapp, asked: !!u?.marketingAskedAt };
  }
  async setPrefs(userId: string, b: { email?: boolean; sms?: boolean; whatsapp?: boolean }) {
    const u: any = await this.db.user.findUnique({ where: { id: userId } });
    const data: any = { marketingEmail: !!b.email && !!u.email, marketingSms: !!b.sms && !!u.phone, marketingWhatsapp: !!b.whatsapp && !!u.phone, marketingAskedAt: new Date() };
    if (data.marketingEmail || data.marketingSms || data.marketingWhatsapp) { data.marketingConsentAt = new Date(); if (!u.unsubToken) data.unsubToken = this.newToken(); }
    await this.db.user.update({ where: { id: userId }, data });
    return this.prefs(userId);
  }
  async unsubscribe(token: string) {
    if (token.length < 6) throw new BadRequestException('This link is not valid');
    const u: any = await this.db.user.findUnique({ where: { unsubToken: token } });
    if (!u) throw new BadRequestException('This link is not valid or was already used');
    await this.db.user.update({ where: { id: u.id }, data: { marketingEmail: false, marketingSms: false, marketingWhatsapp: false } });
    return { ok: true };
  }
  async audience() {
    const [email, sms, whatsapp] = await Promise.all([
      this.db.user.count({ where: { marketingEmail: true, email: { not: null }, deletedAt: null } }),
      this.db.user.count({ where: { marketingSms: true, phone: { not: null }, deletedAt: null } }),
      this.db.user.count({ where: { marketingWhatsapp: true, phone: { not: null }, deletedAt: null } }),
    ]);
    return { email, sms, whatsapp };
  }
  // For the owner's WhatsApp Business broadcasts: only people who ticked WhatsApp. Automatic WhatsApp sending is not built.
  async whatsappList() { const l: any[] = await this.db.user.findMany({ where: { marketingWhatsapp: true, phone: { not: null }, deletedAt: null }, select: { name: true, phone: true } }); return l.map(u => ({ name: u.name || '', phone: u.phone })); }

  emailParts(p: Promo, name: string | null, token: string) {
    const site = webUrl(), unsub = `${site}/u/${token}`;
    const paras = p.body.split(/\n+/).map(l => `<p style="margin:0 0 12px;line-height:1.5">${esc(l)}</p>`).join('');
    const btn = p.linkUrl ? `<p style="margin:18px 0"><a href="${esc(p.linkUrl)}" style="background:#FFC400;color:#000;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:24px;display:inline-block">${esc(p.linkLabel || 'Shop now')}</a></p>` : '';
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#fff;color:#1a1a1a;border:1px solid #eee"><div style="background:#0a0a0a;padding:16px;text-align:center"><img src="${site}/logo-dark.png" alt="Omora" height="54" style="height:54px"></div><div style="padding:22px"><h2 style="margin:0 0 14px;font-size:20px">${esc(p.title)}</h2><p style="margin:0 0 12px">Hi ${esc((name || '').split(' ')[0] || 'there')},</p>${paras}${btn}</div><div style="font-size:12px;color:#777;padding:14px 22px;border-top:1px solid #eee">You receive this because you chose to get offers from Omora (omoramarketplace.com), Nairobi, Kenya. <a href="${unsub}" style="color:#777">Unsubscribe</a> at any time, free of charge.</div></div>`;
    const text = `${p.title}\n\n${p.body}${p.linkUrl ? `\n\n${p.linkUrl}` : ''}\n\nUnsubscribe (free): ${unsub}`;
    return { html, text, headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
  }
  smsText(p: Promo, token: string) { return `Omora: ${p.title}. ${p.body}${p.linkUrl ? ' ' + p.linkUrl : ''}\nStop: ${webUrl().replace(/^https?:\/\//, '')}/u/${token}`; }
  validate(p: Promo, channels: string[]) {
    if (channels.includes('SMS') && this.smsText(p, 'x'.repeat(12)).length > 306) throw new BadRequestException('The text is too long for SMS (about 300 characters at most, including the stop link). Shorten it or send by email only.');
  }
  private async deliver(ch: string, u: any, p: Promo): Promise<boolean> {
    const token = await this.tokenFor(u);
    try {
      if (ch === 'EMAIL') { const m = this.emailParts(p, u.name, token); return await this.email.send(u.email, p.title, m.text, { html: m.html, headers: m.headers }); }
      return await this.sms.send(u.phone, this.smsText(p, token));
    } catch (e) { console.error('promotion delivery failed', e); return false; }
  }
  // A test goes only to the admin who is sending it.
  async sendTest(adminId: string, p: Promo, channels: string[]) {
    this.validate(p, channels);
    const u: any = await this.db.user.findUnique({ where: { id: adminId } });
    const sent: string[] = [];
    for (const ch of channels) { if ((ch === 'EMAIL' && u.email) || (ch === 'SMS' && u.phone)) { if (await this.deliver(ch, u, p)) sent.push(ch === 'EMAIL' ? `email to ${u.email}` : `SMS to ${u.phone}`); } }
    if (!sent.length) throw new BadRequestException('Your admin account has no email address or phone number to send a test to');
    return { sent };
  }
  async create(adminId: string, p: Promo, channels: string[]) {
    this.validate(p, channels);
    const a = await this.audience();
    const target = (channels.includes('EMAIL') ? a.email : 0) + (channels.includes('SMS') ? a.sms : 0);
    if (!target) throw new BadRequestException('Nobody has opted in on the channels you chose yet');
    const promo: any = await this.db.promotion.create({ data: { title: p.title.trim(), body: p.body.trim(), linkUrl: p.linkUrl || null, linkLabel: p.linkLabel || null, channels: channels.join(','), createdBy: adminId, targetCount: target } });
    this.run(promo.id).catch(e => console.error('promotion run failed', e)); // runs in the background; the admin screen shows progress
    return promo;
  }
  // Sends to everyone opted in who has not been sent this promotion yet, so it is safe to run again after a restart (nobody gets it twice).
  async run(id: string) {
    const p: any = await this.db.promotion.findUnique({ where: { id } });
    if (!p) return;
    await this.db.promotion.update({ where: { id }, data: { status: 'SENDING' } });
    try {
      for (const ch of String(p.channels).split(',')) {
        const where: any = ch === 'EMAIL' ? { marketingEmail: true, email: { not: null }, deletedAt: null } : { marketingSms: true, phone: { not: null }, deletedAt: null };
        const users: any[] = await this.db.user.findMany({ where, select: { id: true, name: true, email: true, phone: true, unsubToken: true } });
        for (const u of users) {
          if (await this.db.promotionLog.findUnique({ where: { promotionId_userId_channel: { promotionId: id, userId: u.id, channel: ch } } })) continue;
          const ok = await this.deliver(ch, u, p);
          await this.db.promotionLog.create({ data: { promotionId: id, userId: u.id, channel: ch, ok } });
          await this.db.promotion.update({ where: { id }, data: ok ? { sentCount: { increment: 1 } } : { failedCount: { increment: 1 } } });
          await sleep(ch === 'EMAIL' ? 250 : 120);
        }
      }
      await this.db.promotion.update({ where: { id }, data: { status: 'DONE', finishedAt: new Date() } });
    } catch (e) { await this.db.promotion.update({ where: { id }, data: { status: 'FAILED' } }); throw e; }
  }
}
