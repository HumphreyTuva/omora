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
  async setDelivery(deliveryFee: number, freeAbove: number) {
    const put = (key: string, v: number) => this.db.setting.upsert({ where: { key }, update: { value: String(v) }, create: { key, value: String(v) } });
    await this.db.$transaction([put('DELIVERY_FEE', deliveryFee), put('FREE_DELIVERY_ABOVE', freeAbove)]);
  }
}
