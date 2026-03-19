import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService, HomeDashboardData, BillingData } from './dashboard.service';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('home')
  async getHomeData(
    @Req() req: { user: { id: string } },
  ): Promise<HomeDashboardData> {
    return this.dashboardService.getHomeData(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('billing')
  async getBillingData(
    @Req() req: { user: { id: string } },
  ): Promise<BillingData> {
    return this.dashboardService.getBillingData(req.user.id);
  }
}
