import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  async getPendingGoals() {
    return this.prisma.goal.findMany({
      where: { status: 'PENDING' },
      include: {
        dream: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  async approveGoal(id: string) {
    return this.prisma.goal.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async rejectGoal(id: string) {
    return this.prisma.goal.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }

  async getPendingLogs() {
    return this.prisma.goalLog.findMany({
      where: { status: 'PENDING' },
      include: {
        goal: true,
        // user: {
        //   select: {
        //     email: true,
        //   },
        // },
      },
    });
  }

  async approveLog(id: string) {
    return this.prisma.goalLog.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async rejectLog(id: string) {
    return this.prisma.goalLog.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }
}
