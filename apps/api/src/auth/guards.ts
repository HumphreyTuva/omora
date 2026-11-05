import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
export const Roles = (...r: string[]) => SetMetadata('roles', r);
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService, private ref: Reflector, private db: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    try { const p = await this.jwt.verifyAsync(token); req.user = { id: p.sub, role: p.role }; }
    catch { throw new UnauthorizedException(); }
    // Use the account's current role from the database (so a changed role or a deleted account takes effect immediately), not the one in the token.
    const u = await this.db.user.findUnique({ where: { id: req.user.id }, select: { role: true, deletedAt: true } });
    if (!u || u.deletedAt) throw new UnauthorizedException();
    req.user.role = u.role;
    const roles = this.ref.get<string[]>('roles', ctx.getHandler());
    if (roles?.length && !roles.includes(req.user.role)) throw new ForbiddenException();
    return true;
  }
}
