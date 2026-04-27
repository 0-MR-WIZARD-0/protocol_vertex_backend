/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('daily')
  daily(
    @CurrentUser() user,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.dailyGraph(user.id, Number(year), Number(month));
  }

  @Get('monthly')
  monthly(@CurrentUser() user, @Query('year') year: string) {
    return this.service.monthlyGraph(user.id, Number(year));
  }

  @Get('yearly')
  yearly(@CurrentUser() user) {
    return this.service.yearlyGraph(user.id);
  }
}
