import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { KeycloakService } from './keycloak.service';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      signOptions: { expiresIn: 900 },
    }),
    MailModule,
    StorageModule,
    forwardRef(() => ReferralModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, KeycloakService],
  exports: [AuthService, KeycloakService],
})
export class AuthModule {}
