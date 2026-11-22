import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma.service';
// SMS_MODE=mock (default) prints messages in the API terminal. SMS_MODE=live sends through Africa's Talking.
@Injectable()
export class SmsService {
  private day = ''; private count = 0;
  // A daily cap protects you from a surprise bill (for example someone repeatedly requesting sign-in codes). Default 300 messages a day; change it with SMS_DAILY_LIMIT.
  private underLimit() {
    const d = new Date().toISOString().slice(0, 10);
    if (d !== this.day) { this.day = d; this.count = 0; }
    if (this.count >= Number(process.env.SMS_DAILY_LIMIT || 300)) { console.error('SMS daily limit reached, message not sent'); return false; }
    this.count++; return true;
  }
  // Returns true only if Africa's Talking accepted the message for this phone number.
  async send(phone: string, message: string): Promise<boolean> {
    if (process.env.SMS_MODE !== 'live') { console.log(`[DEV SMS] ${phone}: ${message}`); return true; }
    if (!this.underLimit()) return false;
    try {
      const body = new URLSearchParams({ username: process.env.AT_USERNAME!, to: phone, message });
      if (process.env.AT_SENDER_ID) body.set('from', process.env.AT_SENDER_ID); // the approved sender name, e.g. OMORA
      const r = await fetch(`${process.env.AT_BASE || 'https://api.africastalking.com'}/version1/messaging`, {
        method: 'POST', headers: { apiKey: process.env.AT_API_KEY!, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body,
      });
      const d: any = await r.json().catch(() => ({}));
      if (!r.ok) { console.error('SMS failed', r.status, JSON.stringify(d).slice(0, 300)); return false; }
      const rec = d?.SMSMessageData?.Recipients?.[0]; // an HTTP 201 can still hide a failure for this number (bad number, no balance, blocked sender)
      if (!rec || !([100, 101, 102].includes(Number(rec.statusCode)) || /success/i.test(String(rec.status)))) { console.error('SMS not accepted:', rec?.status || JSON.stringify(d).slice(0, 300)); return false; }
      return true;
    } catch (e) { console.error('SMS error', e); return false; }
  }
}
// EMAIL_MODE=mock (default): prints emails in the API terminal.
// EMAIL_MODE=brevo: sends through Brevo's web API (works on free hosts that block SMTP). Needs BREVO_API_KEY and EMAIL_FROM.
// EMAIL_MODE=live: sends through any SMTP provider (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS). Some free hosts block SMTP ports.
// send() returns true if the email was accepted for delivery.
@Injectable()
export class EmailService {
  private tx = process.env.EMAIL_MODE === 'live' ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: +(process.env.SMTP_PORT || 587) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;
  private from() {
    const raw = process.env.EMAIL_FROM || 'Omora <no-reply@example.com>', m = /^\s*(.*?)\s*<(.+)>\s*$/.exec(raw);
    return m ? { name: m[1].replace(/^"|"$/g, '') || 'Omora', email: m[2] } : { name: 'Omora', email: raw.trim() };
  }
  async send(to: string, subject: string, text: string, opts?: { html?: string; headers?: Record<string, string> }): Promise<boolean> {
    const mode = process.env.EMAIL_MODE;
    if (mode === 'brevo') {
      try {
        const r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY || '', 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ sender: this.from(), to: [{ email: to }], subject, ...(opts?.html ? { htmlContent: opts.html } : { textContent: text }), ...(opts?.headers ? { headers: opts.headers } : {}) }),
        });
        if (!r.ok) { console.error('Brevo email failed', r.status, await r.text().catch(() => '')); return false; }
        return true;
      } catch (e) { console.error('Brevo email error', e); return false; }
    }
    if (!this.tx) { console.log(`[DEV EMAIL] ${to}: ${subject} - ${text}`); return true; }
    try { await this.tx.sendMail({ from: process.env.EMAIL_FROM || 'Omora <no-reply@example.com>', to, subject, text, ...(opts?.html ? { html: opts.html } : {}), ...(opts?.headers ? { headers: opts.headers } : {}) }); return true; } catch (e) { console.error('Email error', e); return false; }
  }
}
// One place to notify people: always an in-app message, optionally an SMS (or an email for email-only accounts). Failures never break the main action.
@Injectable()
export class NotificationsService {
  constructor(private db: PrismaService, private sms: SmsService, private email: EmailService) {}
  async notifyRole(role: string, title: string, body: string, link?: string, urgent = false) {
    try { const users: { id: string }[] = await this.db.user.findMany({ where: { role: role as any, deletedAt: null }, select: { id: true } }); for (const u of users) await this.notify(u.id, title, body, link, urgent); } catch (e) { console.error('notifyRole failed', e); }
  }
  notifyAdmins(title: string, body: string, link?: string, urgent = false) { return this.notifyRole('ADMIN', title, body, link, urgent); }
  async notify(userId: string, title: string, body: string, link?: string, urgent = false) {
    try {
      const u = await this.db.user.findUnique({ where: { id: userId } });
      if (!u) return;
      await this.db.notification.create({ data: { userId, title, body, link } });
      if (urgent) { if (u.phone) await this.sms.send(u.phone, `Omora: ${title}. ${body}`); else if (u.email) await this.email.send(u.email, `Omora: ${title}`, body); }
    } catch (e) { console.error('notify failed', e); }
  }
}
