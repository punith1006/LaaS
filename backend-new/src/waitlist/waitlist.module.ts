import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ComputeModule } from '../compute/compute.module';
import { MailModule } from '../mail/mail.module';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      signOptions: { expiresIn: 900 },
    }),
    ComputeModule,
    MailModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
