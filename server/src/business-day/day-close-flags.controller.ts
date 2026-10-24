import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { BusinessDayService } from './business-day.service';

/** Resolving close-time flags (F13). Owner-only (close_day). */
@Controller('day-close-flags')
@Permissions('close_day')
export class DayCloseFlagsController {
  constructor(private readonly service: BusinessDayService) {}

  @Post(':id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.service.resolveFlag(id, actor);
  }
}
