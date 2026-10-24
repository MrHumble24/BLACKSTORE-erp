import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { ListQueryDto } from '../common/list-query.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';
import { InvestorTransactionsService } from './investor-transactions.service';
import { InvestorsService } from './investors.service';

/** Investor summary list (any user) and full management (manage_investors). */
@Controller('investors')
export class InvestorsController {
  constructor(
    private readonly investors: InvestorsService,
    private readonly transactions: InvestorTransactionsService,
  ) {}

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.investors.findAll(query.all);
  }

  @Get(':id')
  @Permissions('manage_investors')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.investors.findOne(id);
  }

  @Post()
  @Permissions('manage_investors')
  create(@Body() dto: CreateInvestorDto, @CurrentUser() actor: PublicUser) {
    return this.investors.create(dto, actor.id);
  }

  @Patch(':id')
  @Permissions('manage_investors')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvestorDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.investors.update(id, dto, actor.id);
  }

  @Get(':id/transactions')
  @Permissions('manage_investors')
  findTransactions(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.transactions.findAll(id, query);
  }

  @Post(':id/transactions')
  @Permissions('manage_investors')
  createTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTransactionDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.transactions.create(id, dto, actor.id);
  }

  /** Mints (or reuses) the investor's Telegram invite link (F23); POST because it may write a token row. */
  @Post(':id/telegram-link')
  @Permissions('manage_investors')
  telegramLink(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.investors.telegramLink(id, actor.id);
  }

  /** Clears the investor's Telegram link (F24), also for inactive investors so they can be cleaned up. */
  @Delete(':id/telegram-link')
  @Permissions('manage_investors')
  @HttpCode(204)
  async telegramUnlink(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    await this.investors.telegramUnlink(id, actor.id);
  }
}
