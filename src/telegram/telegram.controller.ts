import { BadRequestException, Body, Controller, Post } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Controller('telegram')
export class TelegramController {
  constructor(private prisma: PrismaService) {}

  @Post('connect')
  async connect(
    @Body()
    body: {
      code: string;
      telegramId: string;
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        telegramCode: body.code,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid telegram code');
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        telegramId: body.telegramId,
        telegramCode: null,
      },
    });

    return {
      success: true,
    };
  }
}
