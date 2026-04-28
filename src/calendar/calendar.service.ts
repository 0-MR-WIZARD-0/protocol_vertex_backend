/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Goal, GoalLog } from '@prisma/client';

type GoalWithLogs = Goal & { logs: GoalLog[] };

type DayGoal = {
  id: string;
  title: string;
  slots: string[];
  completedSlots: string[];
  deadline: Date;
};

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  private toDateKey(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  async getDay(userId: string, date: Date) {
    const goals = (await this.prisma.goal.findMany({
      where: {
        userId,
        status: 'APPROVED',
      },
      include: {
        logs: true,
      },
    })) as GoalWithLogs[];

    const dateKey = this.toDateKey(date);

    const result: DayGoal[] = [];

    for (const goal of goals) {
      if (!this.isGoalActive(goal, date)) continue;

      const logsToday = goal.logs.filter(
        (l) =>
          this.toDateKey(new Date(l.date)) === dateKey &&
          l.status === 'APPROVED',
      );

      const completedSlots: string[] = Array.from(
        new Set(
          logsToday
            .map((l) => l.timeSlot)
            .filter((t): t is string => typeof t === 'string'),
        ),
      );

      result.push({
        id: goal.id,
        title: goal.title,
        slots: goal.slots,
        completedSlots,
        deadline: goal.deadline,
      });
    }

    return {
      date,
      goals: result,
      tasks: [],
      reminders: [],
    };
  }

  async getMonth(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const goals = (await this.prisma.goal.findMany({
      where: {
        userId,
        status: 'APPROVED',
      },
      include: {
        logs: true,
      },
    })) as GoalWithLogs[];

    const days: Record<
      string,
      { total: number; done: number; percent: number }
    > = {};

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = new Date(d.getTime());
      const key = this.toDateKey(date);

      let total = 0;
      let done = 0;

      for (const goal of goals) {
        if (!this.isGoalActive(goal, date)) continue;

        const slots = goal.slots;
        total += slots.length;

        const logs = goal.logs.filter(
          (l) =>
            this.toDateKey(new Date(l.date)) === key && l.status === 'APPROVED',
        );

        const uniqueSlots = new Set(logs.map((l) => l.timeSlot));

        done += uniqueSlots.size;
      }

      if (total > 0) {
        days[key] = {
          total,
          done,
          percent: Math.round((done / total) * 100),
        };
      }
    }

    return {
      year,
      month,
      days,
    };
  }

  private isGoalActive(goal: Goal, date: Date): boolean {
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
