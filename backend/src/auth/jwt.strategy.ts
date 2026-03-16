import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    const keycloakUrl = process.env.KEYCLOAK_URL;
    const keycloakRealm = process.env.KEYCLOAK_REALM;
    const useKeycloak = keycloakUrl && keycloakRealm;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      ...(useKeycloak
        ? {
            secretOrKeyProvider: passportJwtSecret({
              cache: true,
              rateLimit: true,
              jwksRequestsPerMinute: 10,
              jwksUri: `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/certs`,
            }),
            algorithms: ['RS256'],
          }
        : {
            secretOrKey:
              process.env.JWT_SECRET || 'dev-secret-change-in-production',
          }),
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
