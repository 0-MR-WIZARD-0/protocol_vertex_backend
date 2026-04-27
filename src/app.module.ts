import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { GoalsModule } from './goals/goals.module';
import { ModerationModule } from './moderation/moderation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CalendarModule } from './calendar/calendar.module';
import { AppealsModule } from './appeals/appeals.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    GoalsModule,
    ModerationModule,
    AnalyticsModule,
    CalendarModule,
    AppealsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
