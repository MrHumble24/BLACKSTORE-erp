import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { CreateWalkInPurchaseDto } from './dto/create-walk-in-purchase.dto';
import { WalkInPayoutsService } from './walk-in-payouts.service';
import { WalkInPurchasesService } from './walk-in-purchases.service';

/** HTTP for walk-in purchases (PRD FR-25, W5) and their payout confirmation (F32). */
@Controller('walk-in-purchases')
export class WalkInPurchasesController {
  constructor(
    private readonly purchases: WalkInPurchasesService,
    private readonly payouts: WalkInPayoutsService,
  ) {}

  @Post()
  @Permissions('buy_walk_in')
  create(@Body() dto: CreateWalkInPurchaseDto, @CurrentUser() actor: PublicUser) {
    return this.purchases.create(dto, actor);
  }

  @Get('pending')
  @Permissions('close_day')
  findPending(@Query() query: PaginationQueryDto) {
    return this.payouts.findPending(query);
  }

  @Patch(':lineId/pay')
  @Permissions('close_day')
  pay(@Param('lineId', ParseIntPipe) lineId: number, @CurrentUser() actor: PublicUser) {
    return this.payouts.pay(lineId, actor);
  }

  @Patch(':lineId/unpay')
  @Permissions('close_day')
  unpay(@Param('lineId', ParseIntPipe) lineId: number, @CurrentUser() actor: PublicUser) {
    return this.payouts.unpay(lineId, actor);
  }
}
