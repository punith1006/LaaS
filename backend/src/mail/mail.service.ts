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
  
  async sendPasswordResetOtpEmail(to: string, code: string): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject: 'LaaS - Password Reset Code',
      template: 'password-reset',
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

  async sendRunwayWarningEmail(
    to: string,
    context: {
      firstName: string;
      runwayHours: string;
      burnRate: string;
      creditBalance: string;
    },
  ): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject: 'LaaS: Low runway — instances will auto-terminate soon',
      template: 'runway-warning',
      context,
    });
  }

  async sendRunwayTerminationEmail(
    to: string,
    context: {
      firstName: string;
      terminatedCount: number;
      terminatedSessions: Array<{ name: string; config: string; uptime: string }>;
    },
  ): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject: 'LaaS: Runway exhausted — compute instances terminated',
      template: 'runway-termination',
      context,
    });
  }

  // Support Ticket Email Methods
  async sendSupportTicketAdminNotification(
    context: {
      ticketId: string;
      userName: string;
      userEmail: string;
      category: string;
      priority: string;
      subject: string;
      description: string;
      adminPortalUrl: string;
    },
  ): Promise<void> {
    const adminEmail = process.env.SUPPORT_ADMIN_EMAIL || 'punith.vs74064@gmail.com';
    await this.mailer.sendMail({
      to: adminEmail,
      subject: `[LaaS] New Support Ticket - ${context.subject}`,
      template: 'support-ticket-admin',
      context,
    });
  }

  async sendSupportTicketConfirmation(
    to: string,
    context: {
      ticketId: string;
      userName: string;
      category: string;
      subject: string;
      description: string;
      submittedAt: string;
      docsUrl: string;
    },
  ): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject: `LaaS: We received your support ticket - ${context.subject}`,
      template: 'support-ticket-confirmation',
      context,
    });
  }
}
