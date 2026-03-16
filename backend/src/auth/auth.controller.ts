import { Body, Controller, Post, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendOtp(
    @Body() body: { email: string },
    @Req() req: { ip?: string },
  ) {
    await this.auth.sendOtp(body.email);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendOtp(
    @Body() body: { email: string },
    @Req() req: { ip?: string },
  ) {
    await this.auth.resendOtp(body.email, req.ip);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body()
    body: {
      email: string;
      code: string;
      password: string;
      firstName: string;
      lastName: string;
      agreedPolicies: string[];
    },
    @Req() req: { ip?: string },
  ) {
    return this.auth.verifyOtp(
      body.email,
      body.code,
      {
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        agreedPolicies: body.agreedPolicies ?? [],
      },
      req.ip,
    );
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: { ip?: string },
  ) {
    return this.auth.login(body.email, body.password, req.ip);
  }
}
