import {
  Controller,
  Get,
  Query,
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

  @UseGuards(JwtAuthGuard)
  @Get('health')
  async getPlatformHealth() {
    return this.dashboardService.getPlatformHealth();
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard)
  async getActivity(
    @Req() req: { user: { id: string } },
    @Query('days') days?: string,
  ) {
    return this.dashboardService.getRecentActivity(
      req.user.id,
      parseInt(days || '30', 10),
    );
  }
}
