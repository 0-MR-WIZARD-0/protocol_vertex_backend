import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from '../guard/admin.guard';

@Controller('moderation')
@UseGuards(AuthGuard, AdminGuard)
export class ModerationController {
  constructor(private service: ModerationService) {}

  @Get('goals')
  goals() {
    return this.service.getPendingGoals();
  }

  @Patch('goals/:id/approve')
  approveGoal(@Param('id') id: string) {
    return this.service.approveGoal(id);
  }

  @Patch('goals/:id/reject')
  rejectGoal(@Param('id') id: string) {
    return this.service.rejectGoal(id);
  }

  @Get('logs')
  logs() {
    return this.service.getPendingLogs();
  }

  @Patch('logs/:id/approve')
  approveLog(@Param('id') id: string) {
    return this.service.approveLog(id);
  }

  @Patch('logs/:id/reject')
  rejectLog(@Param('id') id: string) {
    return this.service.rejectLog(id);
  }
}
