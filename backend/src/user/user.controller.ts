import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';

class OnboardingProfileDto {
  profession?: string;
  expertiseLevel?: string;
  yearsOfExperience?: number;
  operationalDomains?: string[];
  useCasePurposes?: string[];
  useCaseOther?: string;
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
