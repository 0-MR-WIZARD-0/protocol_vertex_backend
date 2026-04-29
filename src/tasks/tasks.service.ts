/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private toDateKey(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  async create(userId: string, dto: any) {
    const today = this.toDateKey(new Date());
    const date = this.toDateKey(new Date(dto.date));

    if (date < today) {
      throw new Error('Cannot create task in past');
    }

    return this.prisma.task.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        date: new Date(date + 'T00:00:00'),
      },
    });
  }

  async toggle(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.userId !== userId) {
      throw new Error('Task not found');
    }

    const today = this.toDateKey(new Date());
    const taskDate = this.toDateKey(new Date(task.date));

    if (taskDate > today) {
      throw new Error('Cannot complete future task');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: { isDone: !task.isDone },
    });
  }

  async move(userId: string, taskId: string, newDate: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.userId !== userId) {
      throw new Error('Task not found');
    }

    if (task.isDone) {
      throw new Error('Cannot move completed task');
    }

    const today = this.toDateKey(new Date());

    if (newDate < today) {
      throw new Error('Cannot move to past');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        date: new Date(newDate + 'T00:00:00'),
      },
    });
  }

  async delete(userId: string, taskId: string) {
    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  async getByDate(userId: string, date: Date) {
    const key = this.toDateKey(date);

    return this.prisma.task.findMany({
      where: {
        userId,
        date: {
          gte: new Date(key + 'T00:00:00'),
          lt: new Date(key + 'T23:59:59'),
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
