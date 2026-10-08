import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtGuard } from './guards';
class RequestDto {
  @ValidateIf(o => !o.email) @Matches(/^\+254[17]\d{8}$/, { message: 'Use format +2547XXXXXXXX' }) phone?: string;
  @ValidateIf(o => !o.phone) @IsEmail({}, { message: 'Enter a valid email address' }) email?: string;
}
class VerifyDto extends RequestDto { @IsString() @Length(6, 6) code: string; }
const target = (b: RequestDto) => { if (b.email && b.phone) throw new BadRequestException('Use either phone or email'); return b.email ? b.email.trim().toLowerCase() : b.phone!; };
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('otp/request') request(@Body() b: RequestDto) { return this.auth.requestOtp(target(b)); }
  @Post('otp/verify') verify(@Body() b: VerifyDto) { return this.auth.verifyOtp(target(b), b.code); }
  @Get('me') @UseGuards(JwtGuard) me(@Req() r: any) { return r.user; }
}
