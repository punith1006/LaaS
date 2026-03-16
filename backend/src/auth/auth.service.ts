import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_WINDOW_MINUTES = 15;
const MAX_RESENDS_PER_WINDOW = 3;
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async sendOtp(email: string): Promise<void> {
    const code = randomBytes(3).readUIntBE(0, 3) % 1000000;
    const padded = code.toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(padded, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otpVerification.create({
      data: {
        email: email.toLowerCase(),
        codeHash,
        purpose: 'email_verification',
        expiresAt,
      },
    });

    await this.mail.sendOtpEmail(email, padded);
  }

  async resendOtp(email: string, ip?: string): Promise<void> {
    const windowStart = new Date(Date.now() - RESEND_WINDOW_MINUTES * 60 * 1000);
    const count = await this.prisma.otpVerification.count({
      where: {
        email: email.toLowerCase(),
        purpose: 'email_verification',
        createdAt: { gte: windowStart },
      },
    });
    if (count >= MAX_RESENDS_PER_WINDOW) {
      throw new BadRequestException(
        'Too many resend attempts. Try again later.',
      );
    }
    await this.sendOtp(email);
  }

  async verifyOtp(
    email: string,
    code: string,
    payload: {
      password: string;
      firstName: string;
      lastName: string;
      agreedPolicies: string[];
    },
    ip?: string,
  ) {
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        email: email.toLowerCase(),
        purpose: 'email_verification',
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }

    const valid = await bcrypt.compare(code, record.codeHash);
    if (!valid) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      if (record.attempts + 1 >= 5) {
        throw new BadRequestException('Too many attempts');
      }
      throw new BadRequestException('Invalid code');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const publicOrg = await this.prisma.organization.findFirst({
      where: { slug: 'public' },
    });
    if (!publicOrg) {
      throw new BadRequestException('Public organization not seeded');
    }

    const publicUserRole = await this.prisma.role.findFirst({
      where: { name: 'public_user' },
    });
    if (!publicUserRole) {
      throw new BadRequestException('Public user role not seeded');
    }

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
    const storageUid = 'u_' + randomBytes(12).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        emailVerifiedAt: new Date(),
        passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        authType: 'public_local',
        defaultOrgId: publicOrg.id,
        storageUid,
        isActive: true,
      },
    });

    await this.prisma.userOrgRole.create({
      data: {
        userId: user.id,
        organizationId: publicOrg.id,
        roleId: publicUserRole.id,
      },
    });

    for (const slug of payload.agreedPolicies) {
      await this.prisma.userPolicyConsent.create({
        data: {
          userId: user.id,
          policySlug: slug,
          agreedAt: new Date(),
          ipAddress: ip ?? undefined,
        },
      });
    }

    await this.mail.sendWelcomeEmail(user.email, user.firstName);

    return this.issueTokens(user);
  }

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
        isActive: true,
      },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip ?? undefined,
      },
    });

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        loginMethod: 'password',
        ipAddress: ip ?? undefined,
        success: true,
      },
    });

    return this.issueTokens(user);
  }

  private async issueTokens(user: { id: string; email: string }) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: 900,
    });
    const refreshToken = this.jwt.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: 604800 },
    );

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}
