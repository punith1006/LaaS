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
  departmentId?: string;
  courseName?: string;
  academicYear?: number;
  graduationYear?: number;
}

interface UpdateProfileDto {
  displayName?: string;
  phone?: string;
  timezone?: string;
  bio?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  skills?: string[];
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
    if (data.departmentId !== undefined) profileData.departmentId = data.departmentId;
    if (data.courseName !== undefined) profileData.courseName = data.courseName;
    if (data.academicYear !== undefined) profileData.academicYear = data.academicYear;
    if (data.graduationYear !== undefined) profileData.graduationYear = data.graduationYear;

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

    // If departmentId is provided, upsert UserDepartment record
    if (data.departmentId) {
      await this.prisma.userDepartment.upsert({
        where: {
          userId_departmentId: {
            userId,
            departmentId: data.departmentId,
          },
        },
        update: {
          isPrimary: true,
        },
        create: {
          userId,
          departmentId: data.departmentId,
          isPrimary: true,
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

  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            department: true,
          },
        },
        wallet: true,
        organization: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = user.wallet;
    const profile = user.profile;

    return {
      // From User
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      timezone: user.timezone,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      authType: user.authType,
      oauthProvider: user.oauthProvider,
      twoFactorEnabled: user.twoFactorEnabled,
      // From UserProfile
      bio: profile?.bio,
      profession: profile?.profession,
      expertiseLevel: profile?.expertiseLevel,
      yearsOfExperience: profile?.yearsOfExperience,
      collegeName: profile?.collegeName,
      courseName: profile?.courseName,
      academicYear: profile?.academicYear,
      departmentName: profile?.department?.name,
      skills: profile?.skills,
      githubUrl: profile?.githubUrl,
      linkedinUrl: profile?.linkedinUrl,
      websiteUrl: profile?.websiteUrl,
      country: profile?.country,
      operationalDomains: profile?.operationalDomains,
      useCasePurposes: profile?.useCasePurposes,
      // From Wallet
      balanceCents: wallet ? Number(wallet.balanceCents) : null,
      currency: wallet?.currency,
      lifetimeSpentCents: wallet ? Number(wallet.lifetimeSpentCents) : null,
      // From Organization
      organizationName: user.organization?.name,
    };
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    await this.prisma.$transaction(async (tx) => {
      // Update User fields (only if provided)
      const userUpdateData: Record<string, unknown> = {};
      if (data.displayName !== undefined) userUpdateData.displayName = data.displayName;
      if (data.phone !== undefined) userUpdateData.phone = data.phone;
      if (data.timezone !== undefined) userUpdateData.timezone = data.timezone;

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userUpdateData,
        });
      }

      // Upsert UserProfile fields (only if provided)
      const profileUpdateData: Record<string, unknown> = {};
      if (data.bio !== undefined) profileUpdateData.bio = data.bio;
      if (data.githubUrl !== undefined) profileUpdateData.githubUrl = data.githubUrl;
      if (data.linkedinUrl !== undefined) profileUpdateData.linkedinUrl = data.linkedinUrl;
      if (data.websiteUrl !== undefined) profileUpdateData.websiteUrl = data.websiteUrl;
      if (data.skills !== undefined) profileUpdateData.skills = data.skills;

      if (Object.keys(profileUpdateData).length > 0) {
        await tx.userProfile.upsert({
          where: { userId },
          update: profileUpdateData,
          create: {
            userId,
            ...profileUpdateData,
          },
        });
      }
    });

    // Return the updated full profile
    return this.getFullProfile(userId);
  }
}
