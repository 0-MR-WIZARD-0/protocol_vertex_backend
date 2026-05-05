import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('telegram')
export class TelegramController {
  constructor(private prisma: PrismaService) {}

  @Post('connect')
  connect(@Body() body: { userId: string; telegramId: string }) {
    return this.prisma.user.update({
      where: { id: body.userId },
      data: { telegramId: body.telegramId },
    });
  }
}
