import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface OnboardingProfileDto {
  profession?: string;
  expertiseLevel?: string;
  yearsOfExperience?: number;
  operationalDomains?: string[];
  useCasePurposes?: string[];
  useCaseOther?: string;
  country?: string;
}

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async saveOnboardingProfile(userId: string, data: OnboardingProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // First check if profile exists
    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    // Prepare the data to save
    const profileData: Record<string, unknown> = {
      isOnboardingComplete: true,
    };

    if (data.profession !== undefined) profileData.profession = data.profession;
    if (data.expertiseLevel !== undefined) profileData.expertiseLevel = data.expertiseLevel;
    if (data.yearsOfExperience !== undefined) profileData.yearsOfExperience = data.yearsOfExperience;
    if (data.operationalDomains !== undefined) profileData.operationalDomains = data.operationalDomains;
    if (data.useCasePurposes !== undefined) profileData.useCasePurposes = data.useCasePurposes;
    if (data.useCaseOther !== undefined) profileData.useCaseOther = data.useCaseOther;
    if (data.country !== undefined) profileData.country = data.country;

    let profile;
    if (existingProfile) {
      profile = await this.prisma.userProfile.update({
        where: { userId },
        data: profileData,
      });
    } else {
      profile = await this.prisma.userProfile.create({
        data: {
          userId,
          ...profileData,
        },
      });
    }

    return {
      success: true,
      profileId: profile.id,
      onboardingComplete: true,
    };
  }

  async getOnboardingStatus(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const p = profile as Record<string, unknown> | null;

    return {
      isOnboardingComplete: (p?.isOnboardingComplete as boolean) ?? false,
      hasProfession: !!(p?.profession as string),
      hasExpertiseLevel: !!(p?.expertiseLevel as string),
      hasYearsOfExperience: !!(p?.yearsOfExperience as number),
      hasOperationalDomains: ((p?.operationalDomains as string[])?.length ?? 0) > 0,
      hasUseCasePurposes: ((p?.useCasePurposes as string[])?.length ?? 0) > 0,
      hasCountry: !!(p?.country as string),
    };
  }
}
