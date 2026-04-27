/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: any) {
    return this.prisma.goal.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        deadline: new Date(dto.deadline),

        repeatType: dto.repeatType,
        repeatDays: dto.repeatDays || [],
        timesPerDay: dto.timesPerDay,

        isDream: dto.isDream,
        dreamId: dto.dreamId,

        status: dto.isDream ? 'PENDING' : 'APPROVED',
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId },
      include: { logs: true },
    });
  }

  async markDone(userId: string, goalId: string, date: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.userId !== userId) {
      throw new ForbiddenException();
    }

    return this.prisma.goalLog.create({
      data: {
        goalId,
        date: new Date(date),
      },
    });
  }

  async getByDate(userId: string, date: Date) {
    const goals = await this.prisma.goal.findMany({
      where: {
        userId,
        status: 'APPROVED',
      },
      include: { logs: true },
    });

    return goals.map((goal) => {
      const isActive = this.isGoalActive(goal, date);

      const log = goal.logs.find((l) => this.sameDay(l.date, date));

      return {
        id: goal.id,
        title: goal.title,
        isActive,
        status: log?.status || null,
      };
    });
  }

  async getStreak(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: { logs: true },
    });

    if (!goal || goal.userId !== userId) return 0;

    const logs = goal.logs
      .filter((l) => l.status === 'APPROVED')
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    let streak = 0;
    const currentDate = new Date();

    while (true) {
      const active = this.isGoalActive(goal, currentDate);

      if (!active) {
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }

      const hasLog = logs.find((l) => this.sameDay(l.date, currentDate));

      if (!hasLog) break;

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
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
