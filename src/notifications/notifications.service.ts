/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getDue(time: string) {
    const list = await this.prisma.notificationSetting.findMany({
      where: {
        isActive: true,
        times: {
          has: time,
        },
      },
      include: {
        user: true,
      },
    });

    const result: { telegramId: string; message: string }[] = [];

    for (const n of list) {
      if (!n.user.telegramId) continue;

      const goals = await this.getTodayGoals(n.userId);

      if (!goals.length) continue;

      result.push({
        telegramId: n.user.telegramId,
        message: this.buildMessage(goals),
      });
    }

    return result;
  }

  async getTodayGoals(userId: string) {
    return this.prisma.goal.findMany({
      where: {
        userId,
        status: 'APPROVED',
      },
      include: { logs: true },
    });
  }

  buildMessage(goals: any[]) {
    let text = '📊 Твои цели на сегодня:\n\n';

    goals.forEach((g, i) => {
      text += `${i + 1}. ${g.title}\n`;
    });

    return text;
  }
}
