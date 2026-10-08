import { Injectable, InternalServerErrorException } from '@nestjs/common';
// MPESA_MODE=mock (default): fakes everything for local testing. MPESA_MODE=live: talks to Daraja.
// Sandbox: MPESA_BASE_URL=https://sandbox.safaricom.co.ke (default)   Production: https://api.safaricom.co.ke
@Injectable()
export class MpesaService {
  private get live() { return process.env.MPESA_MODE === 'live'; }
  private get base() { return process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke'; }
  private async token() {
    const auth = Buffer.from(`${process.env.MPESA_KEY}:${process.env.MPESA_SECRET}`).toString('base64');
    const r = await fetch(`${this.base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } });
    if (!r.ok) { console.error('M-Pesa auth failed', r.status); throw new InternalServerErrorException('M-Pesa is temporarily unavailable'); }
    return (await r.json()).access_token as string;
  }
  private creds() {
    const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14), shortcode = process.env.MPESA_SHORTCODE!;
    return { ts, shortcode, password: Buffer.from(shortcode + process.env.MPESA_PASSKEY + ts).toString('base64') };
  }
  // Sends the "enter your PIN" prompt to the customer's phone. Returns Safaricom's CheckoutRequestID.
  async stkPush(phone: string, amount: number, orderId: string): Promise<string> {
    if (!this.live) return `MOCK-${Date.now()}`;
    const { ts, shortcode, password } = this.creds(), msisdn = phone.replace('+', '');
    const r = await fetch(`${this.base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST', headers: { Authorization: `Bearer ${await this.token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode, Password: password, Timestamp: ts,
        TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline', // Till numbers: CustomerBuyGoodsOnline
        Amount: amount, PartyA: msisdn, PartyB: process.env.MPESA_PARTY_B || shortcode, PhoneNumber: msisdn,
        CallBackURL: process.env.MPESA_CALLBACK_URL, AccountReference: orderId.slice(-10).toUpperCase(), TransactionDesc: 'Omora order',
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.ResponseCode !== '0') { console.error('M-Pesa STK push failed', d); throw new InternalServerErrorException('Could not send the M-Pesa prompt. Check the phone number and try again.'); }
    return d.CheckoutRequestID;
  }
  // Asks Safaricom directly what happened. resultCode: 0 = paid, other number = failed/cancelled, null = still pending/unknown.
  async stkQuery(checkoutRequestId: string): Promise<{ resultCode: number | null }> {
    if (!this.live) return { resultCode: 0 };
    try {
      const { ts, shortcode, password } = this.creds();
      const r = await fetch(`${this.base}/mpesa/stkpushquery/v1/query`, {
        method: 'POST', headers: { Authorization: `Bearer ${await this.token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ BusinessShortCode: shortcode, Password: password, Timestamp: ts, CheckoutRequestID: checkoutRequestId }),
      });
      const d = await r.json().catch(() => ({}));
      return { resultCode: d.ResultCode === undefined ? null : Number(d.ResultCode) };
    } catch (e) { console.error('M-Pesa query error', e); return { resultCode: null }; }
  }
}
