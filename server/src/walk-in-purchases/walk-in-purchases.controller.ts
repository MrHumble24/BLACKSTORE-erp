import { Body, Controller, Post } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { CreateWalkInPurchaseDto } from './dto/create-walk-in-purchase.dto';
import { WalkInPurchasesService } from './walk-in-purchases.service';

/** HTTP for walk-in purchases (PRD FR-25, W5). */
@Controller('walk-in-purchases')
export class WalkInPurchasesController {
  constructor(private readonly purchases: WalkInPurchasesService) {}

  @Post()
  @Permissions('buy_walk_in')
  create(@Body() dto: CreateWalkInPurchaseDto, @CurrentUser() actor: PublicUser) {
    return this.purchases.create(dto, actor);
  }
}
