/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AppealsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, goalLogId: string, message: string) {
    const log = await this.prisma.goalLog.findUnique({
      where: { id: goalLogId },
      include: { goal: true },
    });

    if (!log || log.goal.userId !== userId) {
      throw new ForbiddenException();
    }

    return this.prisma.appeal.create({
      data: {
        goalLogId,
        message,
      },
    });
  }

  async getMy(userId: string) {
    return this.prisma.appeal.findMany({
      where: {
        goalLog: {
          goal: {
            userId,
          },
        },
      },
      include: {
        goalLog: true,
      },
    });
  }

  // ADMIN
  async getPending() {
    return this.prisma.appeal.findMany({
      where: { status: 'PENDING' },
      include: {
        goalLog: {
          include: { goal: true },
        },
      },
    });
  }

  async approve(id: string) {
    return this.prisma.appeal.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async reject(id: string) {
    return this.prisma.appeal.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }
}
