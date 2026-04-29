import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Validates JWTs issued by this backend (login, verify-otp, oauth/callback, refresh).
 * We always use JWT_SECRET: Keycloak is only used for OAuth code exchange and userinfo;
 * we then issue our own session tokens, so they must be verified with our secret, not Keycloak JWKS.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'dev-secret-change-in-production',
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
    type?: string;
    preferred_username?: string;
  }) {
    if (payload.type === 'refresh') {
      throw new UnauthorizedException(
        'Cannot use refresh token for authentication',
      );
    }

    const email =
      payload.email || payload.preferred_username || '';

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: payload.sub }, { keycloakSub: payload.sub }, { email }],
        deletedAt: null,
      },
    });

    if (!user && email) {
      return {
        id: payload.sub,
        email,
        firstName: null,
        lastName: null,
        emailVerifiedAt: null,
        isKeycloakOnly: true,
      };
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
