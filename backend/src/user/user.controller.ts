import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';

class OnboardingProfileDto {
  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  expertiseLevel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operationalDomains?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  useCasePurposes?: string[];

  @IsOptional()
  @IsString()
  useCaseOther?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

@Controller('api/user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Post('onboarding')
  async saveOnboardingProfile(
    @Req() req: { user: { id: string } },
    @Body() data: OnboardingProfileDto,
  ) {
    return this.userService.saveOnboardingProfile(req.user.id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('onboarding-status')
  async getOnboardingStatus(@Req() req: { user: { id: string } }) {
    return this.userService.getOnboardingStatus(req.user.id);
  }
}
