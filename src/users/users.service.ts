import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createTelegramCode(userId: string) {
    const code = randomBytes(3).toString('hex').toUpperCase();

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        telegramCode: code,
      },
    });

    return {
      code,
    };
  }
}
