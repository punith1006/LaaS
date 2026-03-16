import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailer: MailerService) {}

  async sendOtpEmail(to: string, code: string): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject: 'Your LaaS verification code',
      template: 'otp',
      context: { code },
    });
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject: 'Welcome to LaaS',
      template: 'welcome',
      context: { firstName },
    });
  }
}
