import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { normalizePhone } from '../common/phone';
import { IsEmail, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtGuard } from './guards';
import { RateLimit } from '../common/rate-limit';
class RequestDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizePhone(value) ?? value : value))
  @ValidateIf(o => !o.email) @Matches(/^\+254[17]\d{8}$/, { message: 'Enter a valid Kenyan phone number, e.g. 0712 345 678' }) phone?: string;
  @ValidateIf(o => !o.phone) @IsEmail({}, { message: 'Enter a valid email address' }) email?: string;
}
class VerifyDto extends RequestDto { @IsString() @Length(6, 6) code: string; }
class GoogleDto { @IsString() @Length(20, 4000) credential: string; }
const target = (b: RequestDto) => { if (b.email && b.phone) throw new BadRequestException('Use either phone or email'); return b.email ? b.email.trim().toLowerCase() : b.phone!; };
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('otp/request') @RateLimit(6, 600) request(@Body() b: RequestDto) { return this.auth.requestOtp(target(b)); }
  @Post('otp/verify') @RateLimit(15, 600) verify(@Body() b: VerifyDto) { return this.auth.verifyOtp(target(b), b.code); }
  @Post('google') @RateLimit(20, 600) google(@Body() b: GoogleDto) { return this.auth.googleSignIn(b.credential); }
  @Get('me') @UseGuards(JwtGuard) me(@Req() r: any) { return r.user; }
}
