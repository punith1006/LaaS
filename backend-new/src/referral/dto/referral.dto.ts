import { IsString, IsOptional, IsInt, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

// Request DTOs
export class TrackClickDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    ip?: string;
    userAgent?: string;
  };
}

export class GetConversionsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

// Response interfaces
export interface ReferralLinkResponse {
  code: string;
  url: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ReferralStatsResponse {
  totalClicks: number;
  totalSignups: number;
  totalQualified: number;
  totalPending: number;
  totalRewardsCents: number;
  conversions: ConversionSummary[];
}

export interface ConversionSummary {
  id: string;
  referredUserEmail: string;
  status: string;
  rewardStatus: string;
  signupCompletedAt: Date;
  firstPaymentAt: Date | null;
  rewardCreditedAt: Date | null;
}

export interface ConversionHistoryResponse {
  data: ConversionHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConversionHistoryItem {
  id: string;
  referredUserEmail: string;
  referredUserFirstName: string | null;
  status: string;
  rewardStatus: string;
  signupCompletedAt: Date;
  firstPaymentAt: Date | null;
  firstPaymentAmountCents: number | null;
  rewardCreditedAt: Date | null;
  rewardAmountCents: number;
}

export interface TrackClickResponse {
  success: boolean;
}
