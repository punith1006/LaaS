import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReferralService } from './referral.service';
import {
  TrackClickDto,
  GetConversionsDto,
  ReferralLinkResponse,
  ReferralStatsResponse,
  ConversionHistoryResponse,
  TrackClickResponse,
} from './dto/referral.dto';

@Controller('api/referral')
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  /**
   * Get or generate user's referral link
   * GET /api/referral/my-link
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-link')
  async getMyLink(
    @Req() req: { user: { id: string } },
  ): Promise<ReferralLinkResponse> {
    return this.referralService.generateReferralLink(req.user.id);
  }

  /**
   * Get referral stats and conversions
   * GET /api/referral/stats
   */
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(
    @Req() req: { user: { id: string } },
  ): Promise<ReferralStatsResponse> {
    return this.referralService.getReferralStats(req.user.id);
  }

  /**
   * Get paginated conversion history
   * GET /api/referral/conversions?page=1&limit=20
   */
  @UseGuards(JwtAuthGuard)
  @Get('conversions')
  async getConversions(
    @Req() req: { user: { id: string } },
    @Query() query: GetConversionsDto,
  ): Promise<ConversionHistoryResponse> {
    return this.referralService.getConversionHistory(
      req.user.id,
      query.page,
      query.limit,
    );
  }

  /**
   * Track a click on a referral link (public endpoint)
   * POST /api/referral/track-click
   */
  @Post('track-click')
  @HttpCode(HttpStatus.OK)
  async trackClick(@Body() body: TrackClickDto): Promise<TrackClickResponse> {
    await this.referralService.trackLinkClick(body.code, body.metadata);
    return { success: true };
  }
}
