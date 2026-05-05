/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateGoalDto } from './dto/create-goal.dto';
import { GoalStatus } from '@prisma/client';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any) {
  return this.prisma.goal.findMany({
      where: {
        userId: user.id,
        status: { not: GoalStatus.DELETE_PENDING },
        OR: [
          { status: GoalStatus.APPROVED },
          ...(user.role === 'ADMIN'
            ? [{ status: GoalStatus.PENDING }]
            : []),
        ],
      },
      include: {
        logs: true,
        dream: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private toDateKey(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  private normalizeDate(date: Date): Date {
    return new Date(this.toDateKey(date) + 'T00:00:00');
  }

  private normalizeSlot(slot: string): string {
    if (['morning', 'day', 'evening'].includes(slot)) return slot;

    if (/^\d{1,2}:\d{2}$/.test(slot)) {
      const [h, m] = slot.split(':');
      return `${h.padStart(2, '0')}:${m}`;
    }

    if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(slot)) {
      const [start, end] = slot.split('-');
      if (start >= end) throw new Error('Invalid interval');

      const [h1, m1] = start.split(':');
      const [h2, m2] = end.split(':');

      return `${h1.padStart(2, '0')}:${m1}-${h2.padStart(2, '0')}:${m2}`;
    }

    throw new Error('Invalid slot format');
  }

  async create(user: any, dto: CreateGoalDto) {
    const today = this.toDateKey(new Date());

    if (dto.startDate < today) throw new Error('Start date cannot be in past');
    if (dto.deadline < today) throw new Error('Deadline cannot be in past');

    const rawSlots = dto.slots?.length ? dto.slots : ['day'];
    const slots = [...new Set(rawSlots.map((s) => this.normalizeSlot(s)))];

    let dreamId: string | null = null;

    if (dto.isDream) {
      if (!dto.dreamTitle || !dto.dreamDescription) {
        throw new Error('Dream requires title and link');
      }

      const dream = await this.prisma.dream.create({
        data: {
          title: dto.dreamTitle,
          description: dto.dreamDescription,
        },
      });

      dreamId = dream.id;
    }

    const status =
      user.role === 'ADMIN'
        ? 'APPROVED'
        : dto.isDream
        ? 'PENDING'
        : 'APPROVED';

    return this.prisma.goal.create({
      data: {
        userId: user.id,
        title: dto.title,
        description: dto.description ?? null,
        startDate: new Date(dto.startDate + 'T00:00:00'),
        deadline: new Date(dto.deadline + 'T23:59:59'),
        repeatType: dto.repeatType,
        repeatDays: dto.repeatDays || [],
        slots,
        isDream: dto.isDream,
        dreamId,
        status,
      },
    });
  }

  async mark(userId: string, goalId: string, dto: any) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: { logs: true },
    });

    if (!goal || goal.userId !== userId) {
      throw new Error('Goal not found');
    }

    if (goal.status !== 'APPROVED') {
      throw new Error('Goal not approved');
    }

    if (this.isGoalFailed(goal, goal.logs)) {
      throw new Error('Goal already failed');
    }

    const today = this.toDateKey(new Date());
    const dateKey = this.toDateKey(new Date(dto.date));

    if (dateKey !== today) throw new Error('Can mark only today');

    const slot = this.normalizeSlot(dto.timeSlot);

    if (!goal.slots.includes(slot)) throw new Error('Invalid slot');

    const date = this.normalizeDate(new Date(dto.date));

    return this.prisma.goalLog.upsert({
      where: {
        goalId_date_timeSlot: { goalId, date, timeSlot: slot },
      },
      update: {},
      create: {
        goalId,
        date,
        timeSlot: slot,
        status: 'APPROVED',
      },
    });
  }

  async unmark(userId: string, goalId: string, dto: any) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: { logs: true },
    });

    if (!goal || goal.userId !== userId) {
      throw new Error('Goal not found');
    }

    if (this.isGoalFailed(goal, goal.logs)) {
      throw new Error('Cannot edit failed goal');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new Error('Wrong password');

    const slot = this.normalizeSlot(dto.timeSlot);
    const date = this.normalizeDate(new Date(dto.date));

    return this.prisma.goalLog.delete({
      where: {
        goalId_date_timeSlot: { goalId, date, timeSlot: slot },
      },
    });
  }

  async requestDelete(userId: string, goalId: string, password: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.userId !== userId) {
      throw new Error('Goal not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Wrong password');

    return this.prisma.goal.update({
      where: { id: goalId },
      data: { status: 'DELETE_PENDING' },
    });
  }

  async getByDate(user: any, date: Date) {
    const goals = await this.prisma.goal.findMany({
      where: {
        userId: user.id,
        status: { not: GoalStatus.DELETE_PENDING },
        OR: [
          { status: GoalStatus.APPROVED },
          ...(user.role === 'ADMIN'
            ? [{ status: GoalStatus.PENDING }]
            : []),
        ],
      },
      include: {
        logs: true,
        dream: true,
      },
    });

    const dateKey = this.toDateKey(date);

    return goals
      .map((goal) => {
        if (!this.isGoalActive(goal, date)) return null;

        const logsToday = goal.logs.filter(
          (l) =>
            this.toDateKey(new Date(l.date)) === dateKey &&
            l.status === 'APPROVED',
        );

        const completedSlots = [...new Set(logsToday.map((l) => l.timeSlot))];

        const dayTotal = goal.slots.length || 1;

        const isApproved = goal.status === 'APPROVED';

        const day = isApproved
          ? {
              total: dayTotal,
              done: completedSlots.length,
              percent: Math.round((completedSlots.length / dayTotal) * 100),
            }
          : { total: 0, done: 0, percent: 0 };

        const total = isApproved
          ? this.calculateGoalProgress(goal)
          : { total: 0, done: 0, percent: 0 };

        const isFailed = isApproved
          ? this.isGoalFailed(goal, goal.logs)
          : false;

        return {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          slots: goal.slots,
          completedSlots,
          deadline: goal.deadline,
          day,
          total,
          isFailed,
          dream: goal.dream,
          status: goal.status,
        };
      })
      .filter(Boolean);
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
    const current = new Date();

    while (true) {
      const key = this.toDateKey(current);

      if (!this.isGoalActive(goal, current)) {
        current.setDate(current.getDate() - 1);
        continue;
      }

      if (!logs.includes(key)) break;

      streak++;
      current.setDate(current.getDate() - 1);
    }

    return streak;
  }

  private calculateGoalProgress(goal: any) {
    const start = new Date(goal.startDate);
    const end = new Date(goal.deadline);

    let total = 0;
    let done = 0;

    const logsMap = new Map<string, Set<string>>();

    for (const l of goal.logs) {
      if (l.status !== 'APPROVED') continue;

      const key = this.toDateKey(new Date(l.date));

      if (!logsMap.has(key)) logsMap.set(key, new Set());

      logsMap.get(key)!.add(l.timeSlot);
    }

    const current = new Date(start);

    while (current <= end) {
      if (!this.isGoalActive(goal, current)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const key = this.toDateKey(current);

      total += goal.slots.length;
      done += logsMap.get(key)?.size || 0;

      current.setDate(current.getDate() + 1);
    }

    return {
      total,
      done,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
    };
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

  private isGoalFailed(goal: any, logs: any[]): boolean {
    const today = this.toDateKey(new Date());
    const current = new Date(goal.startDate);

    while (this.toDateKey(current) < today) {
      if (!this.isGoalActive(goal, current)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      const key = this.toDateKey(current);

      const dayLogs = logs.filter(
        (l) =>
          this.toDateKey(new Date(l.date)) === key &&
          l.status === 'APPROVED',
      );

      const unique = new Set(dayLogs.map((l) => l.timeSlot));

      if (unique.size < goal.slots.length) return true;

      current.setDate(current.getDate() + 1);
    }

    return false;
  }

  async getPendingCount(userId: string) {
    return this.prisma.goal.count({
      where: {
        userId,
        status: 'PENDING',
      },
    });
  }

  async getLogsByDate(userId: string, goalId: string, date: Date) {
  return this.prisma.goalLog.findMany({
    where: {
      goalId,
      goal: {
        userId,
      },
      date: {
        gte: new Date(date.toISOString().slice(0, 10) + 'T00:00:00'),
        lt: new Date(date.toISOString().slice(0, 10) + 'T23:59:59'),
      },
    },
  });
}

async getGoalDay(userId: string, goalId: string, date: string) {
  const goal = await this.prisma.goal.findUnique({
    where: { id: goalId },
    include: { logs: true },
  });

  if (!goal || goal.userId !== userId) {
    throw new Error('Goal not found');
  }

  const dateKey = this.toDateKey(new Date(date));

  const logsToday = goal.logs.filter(
    (l) =>
      this.toDateKey(new Date(l.date)) === dateKey &&
      l.status === 'APPROVED',
  );

  const completed = logsToday.map((l) => l.timeSlot);

  const missed = goal.slots.filter((s) => !completed.includes(s));

  return {
    slots: goal.slots,
    completed,
    missed,
  };
}
}