/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('goals')
@UseGuards(AuthGuard)
export class GoalsController {
  constructor(private goalsService: GoalsService) {}

  @Post()
  create(@CurrentUser() user, @Body() dto: any) {
    return this.goalsService.create(user.id, dto);
  }

  @Get()
  getAll(@CurrentUser() user) {
    return this.goalsService.findAll(user.id);
  }

  @Post(':id/mark')
  mark(
  @CurrentUser() user,
  @Param('id') id: string,
  @Body() body: { date: string; timeSlot: string },
  ) {
    return this.goalsService.mark(user.id, id, body);
  }

  @Post(':id/unmark')
  unmark(
    @CurrentUser() user,
    @Param('id') id: string,
    @Body() dto: { date: string; timeSlot: string; password: string },
  ) {
    return this.goalsService.unmark(user.id, id, dto);
  }

  @Get('calendar')
  calendar(
    @CurrentUser() user,
    @Query('date') date: string,
  ) {
    return this.goalsService.getByDate(
      user.id,
      new Date(date),
    );
  }

  @Get(':id/streak')
  streak(
    @CurrentUser() user,
    @Param('id') id: string,
  ) {
    return this.goalsService.getStreak(user.id, id);
  }

  @Post(':id/delete-request')
  deleteRequest(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body('password') password: string,
  ) {
    return this.goalsService.requestDelete(user.id, id, password);
  }
}
