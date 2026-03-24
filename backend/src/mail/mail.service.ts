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

  async sendSpendLimitWarningEmail(
    to: string,
    context: {
      firstName: string;
      currentSpendRupees: string;
      limitRupees: string;
      percentUsed: number;
      period: string;
      remainingRupees: string;
    },
  ): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject: 'LaaS: Your spend is approaching your limit',
      template: 'spend-limit-warning',
      context,
    });
  }

  async sendSpendLimitEnforcedEmail(
    to: string,
    context: {
      firstName: string;
      limitRupees: string;
      totalSpentRupees: string;
      period: string;
      terminatedCount: number;
      terminatedSessions: Array<{
        name: string;
        config: string;
        uptime: string;
      }>;
    },
  ): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject: 'LaaS: Spend limit reached — compute instances terminated',
      template: 'spend-limit-enforced',
      context,
    });
  }
}
