import {
  IsEmail,
  IsString,
  IsArray,
  IsOptional,
  Length,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d+$/, { message: 'Code must contain only digits' })
  code: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100)
  lastName: string;

  @IsArray()
  @IsString({ each: true })
  agreedPolicies: string[];

  @IsString()
  @IsOptional()
  referralCode?: string;
}
