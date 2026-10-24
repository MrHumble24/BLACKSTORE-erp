import { Body, Controller, Get, Post } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { BusinessDayService } from './business-day.service';
import { CloseDayDto } from './dto/close-day.dto';

/** Owner-only daily close screen (F13). Every route needs close_day (Admin + SuperAdmin). */
@Controller('business-day')
@Permissions('close_day')
export class BusinessDayController {
  constructor(private readonly service: BusinessDayService) {}

  @Get('current')
  current() {
    return this.service.getCurrent();
  }

  @Post('close')
  close(@Body() dto: CloseDayDto, @CurrentUser() actor: PublicUser) {
    return this.service.close(dto, actor);
  }
}
