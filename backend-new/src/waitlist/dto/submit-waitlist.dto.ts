import { IsString, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';

export class SubmitWaitlistDto {
  @IsString()
  currentStatus: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsString()
  computeNeeds: string;

  @IsString()
  expectedDuration: string;

  @IsString()
  urgency: string;

  @IsArray()
  @IsString({ each: true })
  expectations: string[];

  @IsString()
  primaryWorkload: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  workloadDescription?: string;

  @IsBoolean()
  agreedToPolicy: boolean;

  @IsBoolean()
  agreedToComms: boolean;
}
