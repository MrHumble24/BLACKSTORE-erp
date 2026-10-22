import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { LedgerService } from './ledger.service';

/** HTTP for the income/expense ledger. Every route needs manage_expenses (Admin). */
@Controller('ledger')
@Permissions('manage_expenses')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get()
  findAll(@Query() query: QueryLedgerDto) {
    return this.ledger.findAll(query);
  }

  @Get('categories')
  categories() {
    return this.ledger.categories();
  }

  @Post()
  create(@Body() dto: CreateLedgerEntryDto, @CurrentUser() actor: PublicUser) {
    return this.ledger.create(dto, actor);
  }
}
