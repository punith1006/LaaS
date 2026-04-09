import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CheckEmailDto } from './dto/check-email.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // PUBLIC endpoint - returns departments for a university by slug
  @Get('universities/:slug/departments')
  async getUniversityDepartments(@Param('slug') slug: string) {
    return this.auth.getUniversityDepartments(slug);
  }

  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  async checkEmail(@Body() dto: CheckEmailDto) {
    return this.auth.checkEmail(dto.email);
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.auth.sendOtp(dto.email);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendOtp(
    @Body() dto: SendOtpDto,
    @Req() req: { ip?: string },
  ) {
    await this.auth.resendOtp(dto.email, req.ip);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: { ip?: string },
  ) {
    return this.auth.verifyOtp(
      dto.email,
      dto.code,
      {
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        agreedPolicies: dto.agreedPolicies ?? [],
        referralCode: dto.referralCode,
      },
      req.ip,
    );
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: { ip?: string },
  ) {
    return this.auth.login(dto.email, dto.password, req.ip);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refreshTokens(dto.refreshToken);
  }

  @Post('oauth/callback')
  async oauthCallback(
    @Body() dto: OAuthCallbackDto,
    @Req() req: { ip?: string },
  ) {
    return this.auth.handleOAuthCallback(
      dto.code,
      dto.redirectUri,
      req.ip,
      dto.idpHint,
      dto.referralCode,
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(
    @Req()
    req: {
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        emailVerifiedAt: Date | null;
        authType?: string;
        storageProvisioningStatus?: string | null;
        storageProvisioningError?: string | null;
        storageProvisionedAt?: Date | null;
      };
    },
  ) {
    const {
      id,
      email,
      firstName,
      lastName,
      emailVerifiedAt,
      authType,
      storageProvisioningStatus,
      storageProvisioningError,
      storageProvisionedAt,
    } = req.user;
    const storageQuotaGb =
      authType === 'university_sso' ? 5 : undefined;

    let institutionSlug: string | undefined;
    if (authType === 'institution_local' || authType === 'university_sso') {
      institutionSlug = await this.auth.getInstitutionSlugForUser(id);
    }

    return {
      id,
      email,
      firstName,
      lastName,
      emailVerifiedAt,
      authType,
      storageProvisioningStatus: storageProvisioningStatus ?? undefined,
      storageProvisioningError: storageProvisioningError ?? undefined,
      storageProvisionedAt: storageProvisionedAt ?? undefined,
      storageQuotaGb,
      institutionSlug,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('storage-retry')
  async storageRetry(@Req() req: { user: { id: string } }) {
    return this.auth.retryStorageProvisioning(req.user.id);
  }
}
