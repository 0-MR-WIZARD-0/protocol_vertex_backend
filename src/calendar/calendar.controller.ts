/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('calendar')
@UseGuards(AuthGuard)
export class CalendarController {
  constructor(private service: CalendarService) {}

  @Get('day')
  getDay(@CurrentUser() user, @Query('date') date: string) {
    return this.service.getDay(user.id, new Date(date));
  }

  @Get('month')
  getMonth(
    @CurrentUser() user,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.getMonth(user.id, Number(year), Number(month));
  }
}
