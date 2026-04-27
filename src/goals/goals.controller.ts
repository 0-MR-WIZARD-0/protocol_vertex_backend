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
    @Body('date') date: string,
  ) {
    return this.goalsService.markDone(user.id, id, date);
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
}
