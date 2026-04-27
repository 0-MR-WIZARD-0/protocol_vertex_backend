/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(email: string, password: string) {
    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hash,
      },
    });

    return this.createSession(user.id);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException();

    return this.createSession(user.id);
  }

  private async createSession(userId: string) {
    const tokenId = randomUUID();
    const randomPart = randomUUID();

    const refreshToken = `${tokenId}.${randomPart}`;

    const hash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.session.create({
      data: {
        userId,
        tokenId,
        refreshTokenHash: hash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { refreshToken };
  }

  async validateSession(refreshToken: string) {
    const [tokenId] = refreshToken.split('.');

    if (!tokenId) return null;

    const session = await this.prisma.session.findUnique({
      where: { tokenId },
      include: { user: true },
    });

    if (!session) return null;

    const valid = await bcrypt.compare(refreshToken, session.refreshTokenHash);

    if (!valid) return null;

    if (session.expiresAt < new Date()) return null;

    return session.user;
  }
}
