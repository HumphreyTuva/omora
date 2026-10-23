import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// Simple per-IP rate limiting, kept in memory (fine for a single server). Put @RateLimit(max, seconds) on a route to make it stricter;
// every other route gets a generous default of 300 requests per minute per IP.
export const RateLimit = (limit: number, seconds: number) => SetMetadata('rate', { limit, seconds });
@Injectable()
export class RateLimitGuard implements CanActivate {
  private hits = new Map<string, number[]>();
  constructor(private ref: Reflector) {
    const t = setInterval(() => this.prune(), 5 * 60_000);
    (t as any).unref?.();
  }
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const cfg = this.ref.get<{ limit: number; seconds: number }>('rate', ctx.getHandler()) || { limit: 300, seconds: 60 };
    const key = `${req.ip}|${ctx.getClass().name}.${ctx.getHandler().name}`, now = Date.now();
    const recent = (this.hits.get(key) || []).filter(t => t > now - cfg.seconds * 1000);
    if (recent.length >= cfg.limit) throw new HttpException('Too many attempts. Please wait a few minutes and try again.', HttpStatus.TOO_MANY_REQUESTS);
    recent.push(now); this.hits.set(key, recent);
    return true;
  }
  private prune() {
    const cutoff = Date.now() - 3600_000;
    for (const [k, v] of this.hits) { const keep = v.filter(t => t > cutoff); if (keep.length) this.hits.set(k, keep); else this.hits.delete(k); }
  }
}
