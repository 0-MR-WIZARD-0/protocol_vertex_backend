/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AppealsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    goalId: string,
    date: string,
    timeSlot: string,
    message: string,
  ) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.userId !== userId) {
      throw new ForbiddenException();
    }

    const existing = await this.prisma.appeal.findFirst({
      where: {
        goalId,
        date: new Date(date),
        timeSlot,
      },
    });

    if (existing) {
      throw new Error('Appeal already exists');
    }

    return this.prisma.appeal.create({
      data: {
        goalId,
        date: new Date(date),
        timeSlot,
        message,
      },
    });
  }

  async getMy(userId: string) {
    return this.prisma.appeal.findMany({
      where: {
        goal: {
          userId,
        },
      },
      include: {
        goal: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPending() {
    return this.prisma.appeal.findMany({
      where: { status: 'PENDING' },
      include: {
        goal: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async approve(id: string) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id },
      include: {
        goal: {
          include: { logs: true },
        },
      },
    });

    if (!appeal) throw new Error('Appeal not found');

    const { goal, date, timeSlot } = appeal;

    await this.prisma.goalLog.upsert({
      where: {
        goalId_date_timeSlot: {
          goalId: goal.id,
          date,
          timeSlot,
        },
      },
      update: {
        status: 'APPROVED',
      },
      create: {
        goalId: goal.id,
        date,
        timeSlot,
        status: 'APPROVED',
      },
    });

    return this.prisma.appeal.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async reject(id: string) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id },
      include: {
        goal: true,
      },
    });

    if (!appeal) throw new Error('Appeal not found');

    const goal = appeal.goal;

    const today = new Date();

    if (goal.deadline < today) {
      await this.prisma.goal.delete({
        where: { id: goal.id },
      });
    }

    return this.prisma.appeal.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }
}
