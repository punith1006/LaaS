import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  IsBoolean,
  IsOptional,
  IsNumber,
  IsString,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';

export class UpdateSpendLimitDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100000)
  limitAmountRupees?: number;

  @IsOptional()
  @IsIn(['daily', 'monthly', 'date_range'])
  period?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsBoolean()
  consentAcknowledged: boolean;
}

@Controller('api/billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * GET /api/billing/spend-limit
   * Returns current spend limit settings for the authenticated user
   */
  @Get('spend-limit')
  async getSpendLimit(@Req() req: { user: { id: string } }) {
    const userId = req.user.id;
    return this.billingService.getSpendLimitSettings(userId);
  }

  /**
   * PATCH /api/billing/spend-limit
   * Updates spend limit settings for the authenticated user
   */
  @Patch('spend-limit')
  async updateSpendLimit(
    @Req() req: { user: { id: string } },
    @Body() dto: UpdateSpendLimitDto,
  ) {
    const userId = req.user.id;

    // Validation logic
    if (dto.enabled) {
      // When enabling, limitAmountRupees and period are required
      if (
        dto.limitAmountRupees === undefined ||
        dto.limitAmountRupees === null
      ) {
        throw new BadRequestException(
          'limitAmountRupees is required when enabling spend limit',
        );
      }

      if (!dto.period) {
        throw new BadRequestException(
          'period is required when enabling spend limit',
        );
      }

      if (!dto.consentAcknowledged) {
        throw new BadRequestException(
          'consentAcknowledged must be true when enabling spend limit',
        );
      }

      // For date_range period, startDate and endDate are required
      if (dto.period === 'date_range') {
        if (!dto.startDate || !dto.endDate) {
          throw new BadRequestException(
            'startDate and endDate are required when period is date_range',
          );
        }

        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);

        if (isNaN(start.getTime())) {
          throw new BadRequestException('startDate must be a valid ISO date');
        }

        if (isNaN(end.getTime())) {
          throw new BadRequestException('endDate must be a valid ISO date');
        }

        if (end <= start) {
          throw new BadRequestException('endDate must be after startDate');
        }
      }
    }

    return this.billingService.updateSpendLimit(userId, dto);
  }
}
