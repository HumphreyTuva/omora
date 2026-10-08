import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma.service';
// SMS_MODE=mock (default) prints messages in the API terminal. SMS_MODE=live sends through Africa's Talking.
@Injectable()
export class SmsService {
  async send(phone: string, message: string) {
    if (process.env.SMS_MODE !== 'live') { console.log(`[DEV SMS] ${phone}: ${message}`); return; }
    try {
      const r = await fetch(`${process.env.AT_BASE || 'https://api.africastalking.com'}/version1/messaging`, {
        method: 'POST', headers: { apiKey: process.env.AT_API_KEY!, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: process.env.AT_USERNAME!, to: phone, message }),
      });
      if (!r.ok) console.error('SMS failed', r.status);
    } catch (e) { console.error('SMS error', e); }
  }
}
// EMAIL_MODE=mock (default) prints emails in the API terminal. EMAIL_MODE=live sends through any SMTP provider (Brevo, Resend, Zoho, Gmail...).
@Injectable()
export class EmailService {
  private tx = process.env.EMAIL_MODE === 'live' ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: +(process.env.SMTP_PORT || 587) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;
  async send(to: string, subject: string, text: string) {
    if (!this.tx) { console.log(`[DEV EMAIL] ${to}: ${subject} - ${text}`); return; }
    try { await this.tx.sendMail({ from: process.env.EMAIL_FROM || 'Omora <no-reply@example.com>', to, subject, text }); } catch (e) { console.error('Email error', e); }
  }
}
// One place to notify people: always an in-app message, optionally an SMS (or an email for email-only accounts). Failures never break the main action.
@Injectable()
export class NotificationsService {
  constructor(private db: PrismaService, private sms: SmsService, private email: EmailService) {}
  async notify(userId: string, title: string, body: string, link?: string, urgent = false) {
    try {
      const u = await this.db.user.findUnique({ where: { id: userId } });
      if (!u) return;
      await this.db.notification.create({ data: { userId, title, body, link } });
      if (urgent) { if (u.phone) await this.sms.send(u.phone, `Omora: ${title}. ${body}`); else if (u.email) await this.email.send(u.email, `Omora: ${title}`, body); }
    } catch (e) { console.error('notify failed', e); }
  }
}
