import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(
    @CurrentUser() user: AuthUser,
    @Query('taxYear') taxYear?: string,
  ) {
    const year = taxYear ? parseInt(taxYear, 10) : undefined;
    return this.dashboardService.getStats(user.firmId, year);
  }
}
