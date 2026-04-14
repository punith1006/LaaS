import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { SubmitWaitlistDto } from './dto/submit-waitlist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async submitWaitlist(@Req() req: any, @Body() dto: SubmitWaitlistDto) {
    const user = req.user;
    return this.waitlistService.submitEntry(
      user.id,
      user.email,
      user.firstName ?? null,
      user.lastName ?? null,
      dto,
    );
  }
}
