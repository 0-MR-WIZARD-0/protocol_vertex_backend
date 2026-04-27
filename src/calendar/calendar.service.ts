/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getDay(userId: string, date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [goals, tasks, reminders] = await Promise.all([
      this.prisma.goal.findMany({
        where: {
          userId,
          status: 'APPROVED',
        },
        include: {
          logs: {
            where: {
              date: {
                gte: start,
                lte: end,
              },
            },
          },
        },
      }),

      this.prisma.task.findMany({
        where: {
          userId,
          date: {
            gte: start,
            lte: end,
          },
        },
      }),

      this.prisma.reminder.findMany({
        where: {
          userId,
          date: {
            gte: start,
            lte: end,
          },
        },
      }),
    ]);

    return {
      date,
      goals: goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        logStatus: goal.logs[0]?.status || null,
      })),
      tasks,
      reminders,
    };
  }

  async getMonth(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const logs = await this.prisma.goalLog.groupBy({
      by: ['date'],
      _count: true,
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

    const totalGoals = await this.prisma.goal.count({
      where: {
        userId,
        status: 'APPROVED',
      },
    });

    const days: Record<string, any> = {};

    for (const log of logs) {
      const key = log.date.toISOString().split('T')[0];

      days[key] = {
        done: log._count,
        total: totalGoals,
        percent: totalGoals === 0 ? 0 : (log._count / totalGoals) * 100,
      };
    }

    return {
      year,
      month,
      days,
    };
  }

  private mapGoal(goal: any, date: Date) {
    const isActive = this.isGoalActive(goal, date);

    const log = goal.logs.find((l) => this.sameDay(l.date, date));

    return {
      id: goal.id,
      title: goal.title,
      isActive,
      status: log?.status || null,
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
}
