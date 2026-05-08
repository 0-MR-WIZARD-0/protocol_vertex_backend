/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from '../guard/admin.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@Controller('appeals')
export class AppealsController {
  constructor(private service: AppealsService) {}

  @Post()
  create(
    @CurrentUser() user,
    @Body()
    body: {
      goalId: string;
      date: string;
      timeSlot: string;
      message: string;
    },
  ) {
    return this.service.create(
      user.id,
      body.goalId,
      body.date,
      body.timeSlot,
      body.message,
    );
  }

  @Get('my')
  my(@CurrentUser() user) {
    return this.service.getMy(user.id);
  }

  @UseGuards(AdminGuard)
  @Get()
  pending() {
    return this.service.getPending();
  }

  @UseGuards(AdminGuard)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }
}
