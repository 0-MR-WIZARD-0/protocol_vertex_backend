/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user, @Body() dto: any) {
    return this.tasksService.create(user.id, dto);
  }

  @Get()
  getByDate(@CurrentUser() user, @Query('date') date: string) {
    return this.tasksService.getByDate(user.id, new Date(date));
  }

  @Post(':id/toggle')
  toggle(@CurrentUser() user, @Param('id') id: string) {
    return this.tasksService.toggle(user.id, id);
  }

  @Post(':id/move')
  move(
    @CurrentUser() user,
    @Param('id') id: string,
    @Body('date') date: string,
  ) {
    return this.tasksService.move(user.id, id, date);
  }

  @Delete(':id')
  delete(@CurrentUser() user, @Param('id') id: string) {
    return this.tasksService.delete(user.id, id);
  }
}
