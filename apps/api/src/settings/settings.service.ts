import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { deliveryConfig } from '../logistics/providers';
// Settings the admin can change without a developer. Stored in the database; if nothing is saved (or the table
// doesn't exist yet) the DELIVERY_FEE / FREE_DELIVERY_ABOVE environment variables, then the defaults (350 / 20000), are used.
@Injectable()
export class SettingsService {
  constructor(private db: PrismaService) {}
  async delivery(): Promise<{ deliveryFee: number; freeAbove: number }> {
    const base = deliveryConfig();
    try {
      const rows: { key: string; value: string }[] = await this.db.setting.findMany({ where: { key: { in: ['DELIVERY_FEE', 'FREE_DELIVERY_ABOVE'] } } });
      const get = (k: string) => { const r = rows.find(x => x.key === k); const n = r ? Number(r.value) : NaN; return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined; };
      return { deliveryFee: get('DELIVERY_FEE') ?? base.deliveryFee, freeAbove: get('FREE_DELIVERY_ABOVE') ?? base.freeAbove };
    } catch { return base; }
  }
  // Pay-later (Baadae) pilot. Off until the admin switches it on in Settings.
  async financing(): Promise<{ enabled: boolean; depositPercent: number; feePercent: number; categories: string[] }> {
    const keys = ['FINANCING_ENABLED', 'FINANCING_DEPOSIT_PERCENT', 'FINANCING_FEE_PERCENT', 'FINANCING_CATEGORIES'];
    let rows: { key: string; value: string }[] = [];
    try { rows = await this.db.setting.findMany({ where: { key: { in: keys } } }); } catch { /* table not created yet */ }
    const v = (k: string) => rows.find(r => r.key === k)?.value;
    const num = (k: string, d: number) => { const n = Number(v(k)); return v(k) !== undefined && Number.isFinite(n) && n >= 0 ? n : d; };
    return { enabled: v('FINANCING_ENABLED') === 'true', depositPercent: num('FINANCING_DEPOSIT_PERCENT', 10), feePercent: num('FINANCING_FEE_PERCENT', 1), categories: (v('FINANCING_CATEGORIES') ?? 'electronics,computers').split(',').map(x => x.trim()).filter(Boolean) };
  }
  async setFinancing(f: { enabled: boolean; depositPercent: number; feePercent: number; categories: string }) {
    const put = (key: string, value: string) => this.db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await this.db.$transaction([put('FINANCING_ENABLED', String(f.enabled)), put('FINANCING_DEPOSIT_PERCENT', String(f.depositPercent)), put('FINANCING_FEE_PERCENT', String(f.feePercent)), put('FINANCING_CATEGORIES', f.categories)]);
  }
  async setDelivery(deliveryFee: number, freeAbove: number) {
    const put = (key: string, v: number) => this.db.setting.upsert({ where: { key }, update: { value: String(v) }, create: { key, value: String(v) } });
    await this.db.$transaction([put('DELIVERY_FEE', deliveryFee), put('FREE_DELIVERY_ABOVE', freeAbove)]);
  }
}
