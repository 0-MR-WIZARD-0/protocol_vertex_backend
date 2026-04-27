/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async daily(userId: string, date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const total = await this.prisma.goal.count({
      where: {
        userId,
        status: 'APPROVED',
      },
    });

    const done = await this.prisma.goalLog.count({
      where: {
        status: 'APPROVED',
        date: {
          gte: start,
          lte: end,
        },
        goal: {
          userId,
        },
      },
    });

    return {
      total,
      done,
      percent: total === 0 ? 0 : (done / total) * 100,
    };
  }

  private isGoalActive(goal: any, date: Date) {
    const day = date.getDay();

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

  private sameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  async dailyGraph(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const logs = await this.prisma.goalLog.groupBy({
      by: ['date'],
      _count: true,
      where: {
        status: 'APPROVED',
        goal: { userId },
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    return logs.map((l) => ({
      date: l.date,
      done: l._count,
    }));
  }

  async monthlyGraph(userId: string, year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const logs = await this.prisma.goalLog.findMany({
      where: {
        status: 'APPROVED',
        goal: { userId },
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        date: true,
      },
    });

    const result: Record<number, number> = {};

    for (const log of logs) {
      const m = log.date.getMonth();
      result[m] = (result[m] || 0) + 1;
    }

    return result;
  }

  async yearlyGraph(userId: string) {
    const logs = await this.prisma.goalLog.findMany({
      where: {
        status: 'APPROVED',
        goal: { userId },
      },
      select: {
        date: true,
      },
    });

    const result: Record<number, number> = {};

    for (const log of logs) {
      const y = log.date.getFullYear();
      result[y] = (result[y] || 0) + 1;
    }

    return result;
  }
}
