import { IsString, IsOptional, IsBoolean, IsArray, MaxLength, IsEmail } from 'class-validator';

export class SubmitWaitlistDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

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

  @IsOptional()
  @IsString()
  expectedDuration?: string;

  @IsOptional()
  @IsString()
  urgency?: string;

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
