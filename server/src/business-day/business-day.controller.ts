import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { BusinessDayService } from './business-day.service';
import { CloseDayDto } from './dto/close-day.dto';
import { UpdateBusinessDayDto } from './dto/update-business-day.dto';

/** Owner-only daily close screen (F13). Every route needs close_day (Admin + SuperAdmin). */
@Controller('business-day')
@Permissions('close_day')
export class BusinessDayController {
  constructor(private readonly service: BusinessDayService) {}

  /** Closed days history, newest first (F28). */
  @Get()
  findClosed(@Query() query: PaginationQueryDto) {
    return this.service.findClosed(query);
  }

  @Get('current')
  current() {
    return this.service.getCurrent();
  }

  @Post('close')
  close(@Body() dto: CloseDayDto, @CurrentUser() actor: PublicUser) {
    return this.service.close(dto, actor);
  }

  /** Admin correction of a closed day's counted values / note (F28). */
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBusinessDayDto, @CurrentUser() actor: PublicUser) {
    return this.service.update(id, dto, actor);
  }
}
