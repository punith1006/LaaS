import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { KeycloakService } from './keycloak.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_WINDOW_MINUTES = 15;
const MAX_RESENDS_PER_WINDOW = 3;
const MAX_OTP_ATTEMPTS = 5;
const SALT_ROUNDS = 10;
const ACCESS_TOKEN_SECONDS = 900;
const REFRESH_TOKEN_SECONDS = 604800;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
    private keycloak: KeycloakService,
    private storage: StorageService,
    private auditService: AuditService,
  ) {}

  async checkEmail(email: string): Promise<{
    available: true;
    institution?: { name: string; shortName: string | null; slug: string };
  }> {
    const normalised = email.toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: { email: normalised, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Domain-based institution detection
    const domain = '@' + normalised.split('@')[1];
    const matchedUniversity = await this.prisma.university.findFirst({
      where: {
        domainSuffixes: { has: domain },
        isActive: true,
        deletedAt: null,
      },
      select: {
        name: true,
        shortName: true,
        slug: true,
      },
    });

    return {
      available: true,
      institution: matchedUniversity
        ? {
            name: matchedUniversity.name,
            shortName: matchedUniversity.shortName,
            slug: matchedUniversity.slug,
          }
        : undefined,
    };
  }

  async sendOtp(email: string): Promise<void> {
    const normalised = email.toLowerCase();

    await this.checkEmail(email);

    const code = randomBytes(3).readUIntBE(0, 3) % 1000000;
    const padded = code.toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(padded, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otpVerification.create({
      data: {
        email: normalised,
        codeHash,
        purpose: 'email_verification',
        expiresAt,
      },
    });

    await this.mail.sendOtpEmail(email, padded);
  }

  async resendOtp(email: string, ip?: string): Promise<void> {
    const normalised = email.toLowerCase();
    const windowStart = new Date(
      Date.now() - RESEND_WINDOW_MINUTES * 60 * 1000,
    );
    const count = await this.prisma.otpVerification.count({
      where: {
        email: normalised,
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
    const normalised = email.toLowerCase();

    const record = await this.prisma.otpVerification.findFirst({
      where: {
        email: normalised,
        purpose: 'email_verification',
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException(
        'Too many failed attempts. Request a new code.',
      );
    }

    const valid = await bcrypt.compare(code, record.codeHash);
    if (!valid) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      throw new BadRequestException('Invalid code');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    // --- Domain-based institution detection ---
    const domain = '@' + normalised.split('@')[1];

    const matchedUniversity = await this.prisma.university.findFirst({
      where: {
        domainSuffixes: { has: domain },
        isActive: true,
        deletedAt: null,
      },
      include: {
        organizations: {
          where: { isActive: true, deletedAt: null },
          take: 1,
        },
      },
    });

    const isInstitutionSignup = !!matchedUniversity && matchedUniversity.organizations.length > 0;

    let authType: string;
    let defaultOrgId: string;
    let roleName: string;
    let storageUid: string | null = null;

    if (isInstitutionSignup) {
      authType = 'institution_local';
      defaultOrgId = matchedUniversity!.organizations[0].id;
      roleName = 'student';
      storageUid = 'u_' + randomBytes(12).toString('hex');
    } else {
      const publicOrg = await this.prisma.organization.findFirst({
        where: { slug: 'public' },
      });
      if (!publicOrg) {
        throw new BadRequestException('Public organization not seeded');
      }
      authType = 'public_local';
      defaultOrgId = publicOrg.id;
      roleName = 'public_user';
    }

    const role = await this.prisma.role.findFirst({
      where: { name: roleName },
    });
    if (!role) {
      throw new BadRequestException(`${roleName} role not seeded`);
    }

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: normalised,
        emailVerifiedAt: new Date(),
        passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        authType,
        defaultOrgId,
        isActive: true,
        storageUid,
        storageProvisioningStatus: isInstitutionSignup ? 'pending' : null,
      },
    });

    await this.prisma.userOrgRole.create({
      data: {
        userId: user.id,
        organizationId: defaultOrgId,
        roleId: role.id,
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

    // --- Storage provisioning for institution signup (10GB) ---
    if (isInstitutionSignup && storageUid) {
      const INSTITUTION_QUOTA_GB = 10;
      const result = await this.storage.provisionUserQuota(storageUid, user.id, INSTITUTION_QUOTA_GB);

      if (result.ok) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            storageProvisioningStatus: 'provisioned',
            storageProvisionedAt: new Date(),
            storageProvisioningError: null,
          },
        });

        // Create UserStorageVolume record
        const quotaBytes = BigInt(INSTITUTION_QUOTA_GB) * BigInt(1024) ** BigInt(3);
        const zfsDatasetPath = `datapool/users/${storageUid}`;
        const nfsExportPath = `/mnt/nfs/users/${storageUid}`;

        await this.prisma.$queryRaw`
          INSERT INTO user_storage_volumes (id, user_id, name, storage_uid, zfs_dataset_path, nfs_export_path, os_choice, quota_bytes, used_bytes, allocation_type, status, provisioned_at, created_at, updated_at, price_per_gb_cents_month)
          VALUES (
            gen_random_uuid()::uuid,
            ${user.id}::uuid,
            'default',
            ${storageUid},
            ${zfsDatasetPath},
            ${nfsExportPath},
            'ubuntu22',
            ${quotaBytes},
            0::bigint,
            'institution_signup',
            'active',
            NOW(),
            NOW(),
            NOW(),
            0
          )
        `;
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            storageProvisioningStatus: 'failed',
            storageProvisioningError: result.error ?? 'Unknown error',
          },
        });
      }

      // Auto-set college name in UserProfile
      await this.prisma.userProfile.upsert({
        where: { userId: user.id },
        update: { collegeName: matchedUniversity!.name },
        create: {
          userId: user.id,
          collegeName: matchedUniversity!.name,
          isOnboardingComplete: false,
        },
      });
    }

    return this.issueTokens(user);
  }

  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
        isActive: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          loginMethod: 'password',
          ipAddress: ip ?? undefined,
          success: false,
          failureReason: 'invalid_password',
        },
      });
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

    // Audit log for successful login
    try {
      await this.auditService.log({
        userId: user.id,
        action: 'auth.login',
        category: 'auth',
        status: 'success',
        details: { authType: user.authType, loginMethod: 'password' },
        ipAddress: ip ?? undefined,
      });
    } catch {
      // Don't let audit logging failures break the login flow
    }

    return this.issueTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    let decoded: { sub: string; email: string; type?: string };
    try {
      decoded = this.jwt.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: decoded.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    let matched = false;
    let matchedTokenId: string | null = null;
    for (const t of storedTokens) {
      if (await bcrypt.compare(refreshToken, t.tokenHash)) {
        matched = true;
        matchedTokenId = t.id;
        break;
      }
    }

    if (!matched || !matchedTokenId) {
      throw new UnauthorizedException('Refresh token not recognised');
    }

    await this.prisma.refreshToken.update({
      where: { id: matchedTokenId },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.issueTokens(user);
  }

  async handleOAuthCallback(
    code: string,
    redirectUri: string,
    ip?: string,
    idpHint?: string,
  ) {
    if (!this.keycloak.isConfigured) {
      throw new BadRequestException('OAuth is not configured');
    }

    const kcTokens = await this.keycloak.exchangeCode(code, redirectUri);
    const userInfo = await this.keycloak.getUserInfo(kcTokens.access_token);
    
    // Store ID token for Keycloak logout
    const idToken = kcTokens.id_token;

    if (!userInfo.email) {
      throw new BadRequestException('Email not provided by OAuth provider');
    }

    const normalised = userInfo.email.toLowerCase();

    // First, try to find user by keycloakSub (most specific match)
    let user = await this.prisma.user.findFirst({
      where: {
        keycloakSub: userInfo.sub,
        deletedAt: null,
      },
    });

    // If not found by keycloakSub, try by email
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: {
          email: normalised,
          deletedAt: null,
        },
      });

      // If found by email but no keycloakSub, link them
      if (user && !user.keycloakSub) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { keycloakSub: userInfo.sub },
        });
      }
    }

    if (user) {
      // Always update name fields from Keycloak if available
      const firstName = userInfo.given_name || userInfo.name?.split(' ')[0] || user.firstName;
      const lastName = userInfo.family_name || userInfo.name?.split(' ').slice(1).join(' ') || user.lastName;
      
      if (firstName !== user.firstName || lastName !== user.lastName) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { firstName, lastName },
        });
      }
    }

    if (!user) {
      const uniOrg = idpHint
        ? await this.prisma.organization.findFirst({
            where: { slug: idpHint, deletedAt: null },
          })
        : null;

      let authType: string;
      let defaultOrgId: string;
      let roleName: string;
      let oauthProvider: string;

      if (uniOrg) {
        const studentRole = await this.prisma.role.findFirst({
          where: { name: 'student' },
        });
        if (!studentRole) {
          throw new BadRequestException('Student role not seeded');
        }
        authType = 'university_sso';
        defaultOrgId = uniOrg.id;
        roleName = 'student';
        oauthProvider = idpHint!;
      } else {
        const publicOrg = await this.prisma.organization.findFirst({
          where: { slug: 'public' },
        });
        const publicUserRole = await this.prisma.role.findFirst({
          where: { name: 'public_user' },
        });
        if (!publicOrg || !publicUserRole) {
          throw new BadRequestException('Public organization not seeded');
        }
        authType = 'public_oauth';
        defaultOrgId = publicOrg.id;
        roleName = 'public_user';
        oauthProvider = this.detectProvider(userInfo.sub);
      }
      const isInstitution = authType === 'university_sso';
      const storageUid = isInstitution
        ? 'u_' + randomBytes(12).toString('hex')
        : null;

      user = await this.prisma.user.create({
        data: {
          email: normalised,
          emailVerifiedAt: userInfo.email_verified ? new Date() : null,
          firstName: userInfo.given_name || userInfo.name?.split(' ')[0] || '',
          lastName:
            userInfo.family_name ||
            userInfo.name?.split(' ').slice(1).join(' ') ||
            '',
          keycloakSub: userInfo.sub,
          authType,
          oauthProvider,
          defaultOrgId,
          storageUid,
          storageProvisioningStatus: isInstitution ? 'pending' : null,
          isActive: true,
        },
      });

      const role = await this.prisma.role.findFirst({
        where: { name: roleName },
      });
      if (role) {
        await this.prisma.userOrgRole.create({
          data: {
            userId: user.id,
            organizationId: defaultOrgId,
            roleId: role.id,
          },
        });
      }

      await this.mail.sendWelcomeEmail(user.email, user.firstName);

      if (authType === 'university_sso' && user.storageUid) {
        const result = await this.storage.provisionUserQuota(user.storageUid, user.id);
        await this.prisma.user.update({
          where: { id: user.id },
          data: result.ok
            ? {
                storageProvisioningStatus: 'provisioned',
                storageProvisionedAt: new Date(),
                storageProvisioningError: null,
              }
            : {
                storageProvisioningStatus: 'failed',
                storageProvisioningError: result.error ?? 'Unknown error',
              },
        });
        if (result.ok) {
          user.storageProvisioningStatus = 'provisioned';
          user.storageProvisionedAt = new Date();
          user.storageProvisioningError = null;
        } else {
          user.storageProvisioningStatus = 'failed';
          user.storageProvisioningError = result.error ?? 'Unknown error';
        }
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip ?? undefined },
    });

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        loginMethod: 'oauth',
        ipAddress: ip ?? undefined,
        success: true,
      },
    });

    // Audit log for successful OAuth login
    try {
      await this.auditService.log({
        userId: user.id,
        action: 'auth.login',
        category: 'auth',
        status: 'success',
        details: { authType: user.authType, oauthProvider: user.oauthProvider, loginMethod: 'oauth' },
        ipAddress: ip ?? undefined,
      });
    } catch {
      // Don't let audit logging failures break the login flow
    }

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      idToken, // Include ID token for Keycloak logout
    };
  }

  async forgotPassword(email: string): Promise<void> {
    if (!this.keycloak.isConfigured) {
      throw new BadRequestException(
        'Password reset is not available. Please contact support.',
      );
    }

    await this.keycloak.triggerPasswordReset(email);
  }

  async retryStorageProvisioning(userId: string): Promise<{
    status: string;
    error?: string;
  }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.authType !== 'university_sso' || !user.storageUid) {
      throw new BadRequestException(
        'Storage retry is only for institution members with storage allocation.',
      );
    }
    const allowed = ['pending', 'failed'].includes(
      user.storageProvisioningStatus ?? '',
    );
    if (!allowed) {
      throw new BadRequestException(
        'Storage is already provisioned or not applicable.',
      );
    }
    const result = await this.storage.provisionUserQuota(user.storageUid, userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: result.ok
        ? {
            storageProvisioningStatus: 'provisioned',
            storageProvisionedAt: new Date(),
            storageProvisioningError: null,
          }
        : {
            storageProvisioningStatus: 'failed',
            storageProvisioningError: result.error ?? 'Unknown error',
          },
    });
    return result.ok
      ? { status: 'provisioned' }
      : { status: 'failed', error: result.error };
  }

  private detectProvider(keycloakSub: string): string {
    if (keycloakSub.includes('google')) return 'google';
    if (keycloakSub.includes('github')) return 'github';
    return 'keycloak';
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    authType: string;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      authType: user.authType,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: ACCESS_TOKEN_SECONDS,
    });

    const refreshToken = this.jwt.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_SECONDS },
    );

    const refreshHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_SECONDS * 1000,
        ),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_SECONDS,
    };
  }
}
