import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { QueryPartnerTransactionsDto } from './dto/query-partner-transactions.dto';
import { QueryPartnersDto } from './dto/query-partners.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnerTransactionsService } from './partner-transactions.service';
import { PartnersService } from './partners.service';

/** HTTP for partner shops (FR-26); every route needs the `consign` permission. */
@Controller('partners')
@Permissions('consign')
export class PartnersController {
  constructor(
    private readonly partners: PartnersService,
    private readonly transactions: PartnerTransactionsService,
  ) {}

  @Get()
  findAll(@Query() query: QueryPartnersDto) {
    return this.partners.findAll(query);
  }

  // Declared before :id so "transactions" is not parsed as an id.
  @Get('transactions')
  findTransactions(@Query() query: QueryPartnerTransactionsDto) {
    return this.transactions.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partners.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePartnerDto, @CurrentUser() actor: PublicUser) {
    return this.partners.create(dto, actor.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePartnerDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.partners.update(id, dto, actor.id);
  }
}
