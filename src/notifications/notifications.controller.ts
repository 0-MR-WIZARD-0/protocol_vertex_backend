/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get('due')
  getDue(@Query('time') time: string) {
    return this.service.getDue(time);
  }

  @Post()
  create(@CurrentUser() user, @Body() dto: { times: string[] }) {
    return this.service.notificationSetting.create({
      data: {
        userId: user.id,
        times: dto.times,
      },
    });
  }

  @Get()
  get(@CurrentUser() user) {
    return this.prisma.notificationSetting.findMany({
      where: { userId: user.id },
    });
  }
}
