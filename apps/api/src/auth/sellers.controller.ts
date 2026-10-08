import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString, Length } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { JwtGuard } from './guards';
class ApplyDto { @IsString() @Length(3, 60) storeName: string; }
@Controller('sellers') @UseGuards(JwtGuard)
export class SellersController {
  constructor(private db: PrismaService, private jwt: JwtService) {}
  // A signed-in customer applies; the account becomes SELLER but the store stays PENDING_VERIFICATION until an admin verifies it.
  @Post('apply') async apply(@Req() req: any, @Body() b: ApplyDto) {
    if (req.user.role !== 'CUSTOMER') throw new BadRequestException('This account cannot become a seller');
    if (await this.db.seller.findUnique({ where: { userId: req.user.id } })) throw new BadRequestException('You already applied');
    await this.db.$transaction([
      this.db.seller.create({ data: { userId: req.user.id, storeName: b.storeName.trim() } }),
      this.db.user.update({ where: { id: req.user.id }, data: { role: 'SELLER' } }),
    ]);
    return { token: await this.jwt.signAsync({ sub: req.user.id, role: 'SELLER' }) }; // fresh token carries the new role
  }
}
