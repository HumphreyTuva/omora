import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
export const Roles = (...r: string[]) => SetMetadata('roles', r);
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService, private ref: Reflector) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    try { const p = await this.jwt.verifyAsync(token); req.user = { id: p.sub, role: p.role }; }
    catch { throw new UnauthorizedException(); }
    const roles = this.ref.get<string[]>('roles', ctx.getHandler());
    if (roles?.length && !roles.includes(req.user.role)) throw new ForbiddenException();
    return true;
  }
}
