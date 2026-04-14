import { Controller, Post, Get, Body, Req, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString } from 'class-validator';
import { WaitlistService } from './waitlist.service';
import { SubmitWaitlistDto } from './dto/submit-waitlist.dto';
import { ComputeService } from '../compute/compute.service';
import { Request } from 'express';

class AnalyzeWorkloadDto {
  @IsString()
  description: string;
}

@Controller('api/waitlist')
export class WaitlistController {
  constructor(
    private readonly waitlistService: WaitlistService,
    private readonly jwtService: JwtService,
    private readonly computeService: ComputeService,
  ) {}

  @Post('analyze-workload')
  async analyzeWorkload(@Body() dto: AnalyzeWorkloadDto) {
    const words = dto.description.trim().split(/\s+/);
    if (words.length < 10) {
      throw new BadRequestException(
        'Description must be at least 10 words to analyze',
      );
    }
    return this.computeService.analyzeWorkload(dto.description);
  }

  @Post()
  async submitWaitlist(@Req() req: Request, @Body() dto: SubmitWaitlistDto) {
    let userId: string | undefined;
    let email: string | undefined;
    let firstName: string | null = null;
    let lastName: string | null = null;

    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const payload = this.jwtService.verify<{
          sub: string;
          email?: string;
          preferred_username?: string;
        }>(token, {
          secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
        });
        userId = payload.sub;
        email = payload.email || payload.preferred_username;
        // firstName/lastName not in JWT payload; service will handle
      }
    } catch {
      // No valid token — proceed as unauthenticated
    }

    // Fall back to DTO-supplied email for unauthenticated users
    if (!email) {
      email = dto.email;
    }
    if (!firstName) {
      firstName = dto.firstName ?? null;
    }
    if (!lastName) {
      lastName = dto.lastName ?? null;
    }

    return this.waitlistService.submitEntry(
      userId,
      email,
      firstName,
      lastName,
      dto,
    );
  }

  @Get('status')
  async getWaitlistStatus(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    let userId: string;
    try {
      const token = authHeader.slice(7);
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const result = await this.waitlistService.getWaitlistStatus(userId);

    if (result) {
      const { position, ...entry } = result;
      return { enrolled: true, entry, position };
    }
    return { enrolled: false };
  }
}
