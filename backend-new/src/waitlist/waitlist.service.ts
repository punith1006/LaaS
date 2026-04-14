import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async submitEntry(
    userId: string | undefined,
    email: string | undefined,
    firstName: string | null,
    lastName: string | null,
    data: {
      currentStatus: string;
      organizationName?: string;
      jobTitle?: string;
      computeNeeds: string;
      expectedDuration?: string;
      urgency?: string;
      expectations: string[];
      primaryWorkload: string;
      workloadDescription?: string;
      agreedToPolicy: boolean;
      agreedToComms: boolean;
    },
  ) {
    if (!userId && !email) {
      throw new BadRequestException(
        'An email address is required for unauthenticated waitlist submissions',
      );
    }

    // Duplicate check: by userId for authenticated users, by email for guests
    if (userId) {
      const existing = await this.prisma.waitlistEntry.findFirst({
        where: { userId },
      });
      if (existing) {
        throw new ConflictException('You have already joined the waitlist');
      }
    } else {
      const existing = await this.prisma.waitlistEntry.findFirst({
        where: { email },
      });
      if (existing) {
        throw new ConflictException(
          'This email address has already joined the waitlist',
        );
      }
    }

    const entry = await this.prisma.waitlistEntry.create({
      data: {
        ...(userId ? { userId } : {}),
        email: email ?? '',
        firstName,
        lastName,
        currentStatus: data.currentStatus,
        organizationName: data.organizationName,
        jobTitle: data.jobTitle,
        computeNeeds: data.computeNeeds,
        expectedDuration: data.expectedDuration ?? '',
        urgency: data.urgency ?? '',
        expectations: data.expectations,
        primaryWorkload: data.primaryWorkload,
        workloadDescription: data.workloadDescription,
        agreedToPolicy: data.agreedToPolicy,
        policyAgreedAt: data.agreedToPolicy ? new Date() : null,
        agreedToComms: data.agreedToComms,
      },
    });

    // Fire-and-forget confirmation email — do not block the response
    // Use entry.email (persisted value) as the authoritative source so authenticated
    // users whose JWT lacks an email field are still covered.
    const recipientEmail = entry.email || email || '';
    if (recipientEmail) {
      this.logger.log(
        `Sending waitlist confirmation email to: ${recipientEmail}`,
      );
      this.mail
        .sendWaitlistConfirmationEmail(recipientEmail, {
          firstName: firstName ?? entry.firstName ?? 'there',
          email: recipientEmail,
          currentStatus: data.currentStatus,
          companyOrOrg: data.organizationName ?? '',
          roleOrDesignation: data.jobTitle ?? '',
          primaryWorkload: data.primaryWorkload,
          computeNeeds: data.computeNeeds,
          expectedDuration: data.expectedDuration,
          expectations: data.expectations,
        })
        .catch((err: Error) =>
          this.logger.error(
            `Waitlist confirmation email failed for ${recipientEmail}: ${err.message}`,
            err.stack,
          ),
        );
    } else {
      this.logger.warn(
        `Waitlist entry ${entry.id} created but no email address available — skipping confirmation email`,
      );
    }

    return {
      id: entry.id,
      email: entry.email,
      status: entry.status,
      createdAt: entry.createdAt,
    };
  }

  async getWaitlistStatus(userId: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { userId },
    });

    if (!entry) {
      return null;
    }

    // Calculate queue position: count of all entries created at or before this entry
    const position = await this.prisma.waitlistEntry.count({
      where: {
        createdAt: {
          lte: entry.createdAt,
        },
      },
    });

    return {
      id: entry.id,
      firstName: entry.firstName,
      lastName: entry.lastName,
      email: entry.email,
      currentStatus: entry.currentStatus,
      organizationName: entry.organizationName,
      jobTitle: entry.jobTitle,
      computeNeeds: entry.computeNeeds,
      expectedDuration: entry.expectedDuration,
      urgency: entry.urgency,
      primaryWorkload: entry.primaryWorkload,
      workloadDescription: entry.workloadDescription,
      status: entry.status,
      createdAt: entry.createdAt,
      position,
    };
  }
}
