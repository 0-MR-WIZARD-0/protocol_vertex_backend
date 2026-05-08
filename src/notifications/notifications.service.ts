/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private validateTimes(times: string[]) {
    const regex = /^\d{2}:\d{2}$/;

    for (const t of times) {
      if (!regex.test(t)) {
        throw new BadRequestException(`Invalid time: ${t}`);
      }
    }
  }

  async create(userId: string, goalId: string | null, times: string[]) {
    this.validateTimes(times);

    return this.prisma.notificationSetting.create({
      data: {
        userId,
        goalId,
        times,
      },
    });
  }

  async update(id: string, times: string[]) {
    this.validateTimes(times);

    return this.prisma.notificationSetting.update({
      where: { id },
      data: { times },
    });
  }

  async delete(id: string) {
    return this.prisma.notificationSetting.delete({
      where: { id },
    });
  }

  async get(userId: string) {
    return this.prisma.notificationSetting.findMany({
      where: { userId },
      include: { goal: true },
    });
  }

  async getDue(time: string) {
    const list = await this.prisma.notificationSetting.findMany({
      where: {
        isActive: true,
        times: { has: time },
      },
      include: {
        user: true,
        goal: {
          include: { logs: true },
        },
      },
    });

    const result: { telegramId: string; message: string }[] = [];

    for (const n of list) {
      if (!n.user.telegramId) continue;

      let goals: any[] = [];

      if (n.goal) {
        goals = [n.goal];
      } else {
        goals = await this.prisma.goal.findMany({
          where: {
            userId: n.userId,
            status: 'APPROVED',
          },
          include: { logs: true },
        });
      }

      const prepared = this.prepareGoals(goals);

      if (!prepared.length) continue;

      const message = this.buildMessage(prepared);

      result.push({
        telegramId: n.user.telegramId,
        message,
      });
    }

    return result;
  }

  private prepareGoals(goals: any[]) {
    const todayKey = this.toDateKey(new Date());

    return goals
      .filter((g) => this.isGoalActive(g, new Date()))
      .map((g) => {
        const todayLogs = g.logs.filter(
          (l) =>
            this.toDateKey(new Date(l.date)) === todayKey &&
            l.status === 'APPROVED',
        );

        const doneToday = new Set(todayLogs.map((l) => l.timeSlot)).size;
        const totalToday = g.slots.length;

        let total = 0;
        let done = 0;

        const logsMap = new Map<string, Set<string>>();

        for (const l of g.logs) {
          if (l.status !== 'APPROVED') continue;

          const key = this.toDateKey(new Date(l.date));

          if (!logsMap.has(key)) logsMap.set(key, new Set());
          logsMap.get(key)!.add(l.timeSlot);
        }

        const current = new Date(g.startDate);

        while (current <= new Date(g.deadline)) {
          if (!this.isGoalActive(g, current)) {
            current.setDate(current.getDate() + 1);
            continue;
          }

          const key = this.toDateKey(current);

          total += g.slots.length;
          done += logsMap.get(key)?.size || 0;

          current.setDate(current.getDate() + 1);
        }

        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        return {
          title: g.title,
          deadline: g.deadline,
          todayDone: doneToday,
          todayTotal: totalToday,
          percent,
          remaining: total - done,
        };
      });
  }

  private progressBar(percent: number) {
    const total = 10;

    const filled = Math.round((percent / 100) * total);

    return '█'.repeat(filled) + '░'.repeat(total - filled);
  }

  private buildMessage(goals: any[]) {
    const today = new Date().toLocaleDateString('ru-RU');

    let text = `🚀 <b>Аналитика на ${today}</b>\n\n`;

    goals.forEach((g, i) => {
      const deadline = new Date(g.deadline).toLocaleDateString('ru-RU');

      const bar = this.progressBar(g.percent);

      text += `🎯 <b>${g.title}</b>\n`;

      text += `┣ 📈 Прогресс: ${bar} ${g.percent}%\n`;

      text += `┣ ✅ Выполнено сегодня: ${g.todayDone}/${g.todayTotal}\n`;

      text += `┣ ⏳ Дней до завершения: ${g.remaining}\n`;

      text += `┗ 📅 Окончание: ${deadline}\n`;

      if (i !== goals.length - 1) {
        text += `\n`;
      }
    });

    return text;
  }

  private toDateKey(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  private isGoalActive(goal: any, date: Date): boolean {
    const d = this.toDateKey(date);
    const start = this.toDateKey(new Date(goal.startDate));
    const end = this.toDateKey(new Date(goal.deadline));

    if (d < start || d > end) return false;

    const day = new Date(date).getDay();

    switch (goal.repeatType) {
      case 'DAILY':
        return true;
      case 'WEEKDAYS':
        return day >= 1 && day <= 5;
      case 'WEEKENDS':
        return day === 0 || day === 6;
      case 'CUSTOM':
        return goal.repeatDays.includes(day);
      default:
        return false;
    }
  }
}
