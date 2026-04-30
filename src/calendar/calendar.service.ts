import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Goal, GoalLog } from '@prisma/client';

type GoalWithLogs = Goal & { logs: GoalLog[] };

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  private toDateKey(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  async getDay(userId: string, date: Date) {
    const goals = await this.prisma.goal.findMany({
      where: {
        userId,
        status: {
          in: ['APPROVED', 'PENDING'],
        },
      },
      include: {
        logs: true,
        dream: true,
      },
    });

    const tasks = await this.prisma.task.findMany({
      where: { userId },
    });

    const dateKey = this.toDateKey(date);

    const goalResult = goals
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

        return {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          slots: goal.slots,
          completedSlots,
          deadline: goal.deadline,
          day,
          total,
          dream: goal.dream ?? null,
          status: goal.status,
        };
      })
      .filter((g) => g !== null);

    const tasksToday = tasks.filter(
      (t) => this.toDateKey(new Date(t.date)) === dateKey,
    );

    return {
      date,
      goals: goalResult,
      tasks: tasksToday,
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

    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
      },
    });

    const days: Record<
      string,
      {
        total: number;
        done: number;
        percent: number;
        hasTasks?: boolean;
      }
    > = {};

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = new Date(d.getTime());
      const key = this.toDateKey(date);

      let total = 0;
      let done = 0;

      for (const goal of goals) {
        if (!this.isGoalActive(goal, date)) continue;

        total += goal.slots.length;

        const logs = goal.logs.filter(
          (l) =>
            this.toDateKey(new Date(l.date)) === key && l.status === 'APPROVED',
        );

        const uniqueSlots = new Set(logs.map((l) => l.timeSlot));

        done += uniqueSlots.size;
      }

      const tasksToday = tasks.filter(
        (t) => this.toDateKey(new Date(t.date)) === key,
      );

      if (tasksToday.length > 0) {
        total += tasksToday.length;
        done += tasksToday.filter((t) => t.isDone).length;
      }

      if (total > 0) {
        days[key] = {
          total,
          done,
          percent: Math.round((done / total) * 100),
          hasTasks: tasksToday.length > 0,
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

  private calculateGoalProgress(goal: GoalWithLogs) {
    const start = new Date(goal.startDate);
    const end = new Date(goal.deadline);

    let total = 0;
    let done = 0;

    const logsMap = new Map<string, Set<string>>();

    for (const l of goal.logs) {
      if (l.status !== 'APPROVED') continue;

      const key = this.toDateKey(new Date(l.date));

      if (!logsMap.has(key)) {
        logsMap.set(key, new Set());
      }

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

    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, percent };
  }
}
