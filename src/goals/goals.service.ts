/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  private toDateKey(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  async create(userId: string, dto: any) {
    return this.prisma.goal.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,

        startDate: new Date(dto.startDate + 'T00:00:00'),
        deadline: new Date(dto.deadline + 'T23:59:59'),

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

  async mark(userId: string, goalId: string, dto: any) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) throw new Error('Goal not found');

    const dateKey = this.toDateKey(new Date(dto.date));

    const normalizedDate = new Date(dateKey + 'T00:00:00'); // ✅

    return this.prisma.goalLog.upsert({
      where: {
        goalId_date_timeSlot: {
          goalId,
          date: normalizedDate,
          timeSlot: dto.timeSlot,
        },
      },
      update: {},
      create: {
        goalId,
        date: normalizedDate,
        timeSlot: dto.timeSlot,
        status: goal.isDream ? 'PENDING' : 'APPROVED',
      },
    });
  }

  async unmark(userId: string, goalId: string, dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) throw new Error('Wrong password');

    const dateKey = this.toDateKey(new Date(dto.date));
    const normalizedDate = new Date(dateKey + 'T00:00:00'); // ✅

    return this.prisma.goalLog.delete({
      where: {
        goalId_date_timeSlot: {
          goalId,
          date: normalizedDate,
          timeSlot: dto.timeSlot,
        },
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

    const dateKey = this.toDateKey(date);

    return goals.map((goal) => {
      const isActive = this.isGoalActive(goal, date);

      const log = goal.logs.find(
        (l) =>
          this.toDateKey(new Date(l.date)) === dateKey &&
          l.status === 'APPROVED',
      );

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
      .map((l) => this.toDateKey(new Date(l.date)));

    let streak = 0;
    let current = new Date();

    while (true) {
      const dateKey = this.toDateKey(current);

      const active = this.isGoalActive(goal, current);

      if (!active) {
        current.setDate(current.getDate() - 1);
        continue;
      }

      if (!logs.includes(dateKey)) break;

      streak++;
      current.setDate(current.getDate() - 1);
    }

    return streak;
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

  async requestDelete(userId: string, goalId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) throw new Error('Wrong password');

    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        status: 'DELETE_PENDING',
      },
    });
  }
}
