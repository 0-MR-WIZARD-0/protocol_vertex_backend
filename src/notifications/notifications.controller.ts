/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { NotificationsService } from './notifications.service';

import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(
    @CurrentUser() user,
    @Body()
    dto: {
      goalId?: string;
      times: string[];
    },
  ) {
    return this.service.create(user.id, dto.goalId || null, dto.times);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    dto: {
      times: string[];
    },
  ) {
    return this.service.update(id, dto.times);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @UseGuards(AuthGuard)
  @Get()
  get(@CurrentUser() user) {
    return this.service.get(user.id);
  }

  @Get('due')
  getDue(@Query('time') time: string) {
    return this.service.getDue(time);
  }
}
