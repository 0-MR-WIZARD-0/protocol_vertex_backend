import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [TelegramController],
  providers: [PrismaService],
})
export class TelegramModule {}
