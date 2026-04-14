import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async submitEntry(
    userId: string,
    email: string,
    firstName: string | null,
    lastName: string | null,
    data: {
      currentStatus: string;
      organizationName?: string;
      jobTitle?: string;
      computeNeeds: string;
      expectedDuration: string;
      urgency: string;
      expectations: string[];
      primaryWorkload: string;
      workloadDescription?: string;
      agreedToPolicy: boolean;
      agreedToComms: boolean;
    },
  ) {
    // Check for existing entry by userId
    const existing = await this.prisma.waitlistEntry.findFirst({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('You have already joined the waitlist');
    }

    const entry = await this.prisma.waitlistEntry.create({
      data: {
        userId,
        email,
        firstName,
        lastName,
        currentStatus: data.currentStatus,
        organizationName: data.organizationName,
        jobTitle: data.jobTitle,
        computeNeeds: data.computeNeeds,
        expectedDuration: data.expectedDuration,
        urgency: data.urgency,
        expectations: data.expectations,
        primaryWorkload: data.primaryWorkload,
        workloadDescription: data.workloadDescription,
        agreedToPolicy: data.agreedToPolicy,
        policyAgreedAt: data.agreedToPolicy ? new Date() : null,
        agreedToComms: data.agreedToComms,
      },
    });

    return {
      id: entry.id,
      email: entry.email,
      status: entry.status,
      createdAt: entry.createdAt,
    };
  }
}
