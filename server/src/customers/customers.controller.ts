import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

/** HTTP for customers (PRD FR-21); every route needs the `sell` permission. */
@Controller('customers')
@Permissions('sell')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(@Query() query: QueryCustomersDto) {
    return this.customers.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customers.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() actor: PublicUser) {
    return this.customers.create(dto, actor.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.customers.update(id, dto, actor.id);
  }

  /** Mints (or reuses) the customer's Telegram invite link (F23); POST because it may write a token row. */
  @Post(':id/telegram-link')
  telegramLink(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.customers.telegramLink(id, actor.id);
  }

  /**
   * Clears the customer's Telegram link (F24). `delete_records` (admin-only) because unlinking removes
   * a link and no closer admin permission exists; a new one would need a seed and role migration.
   */
  @Delete(':id/telegram-link')
  @Permissions('delete_records')
  @HttpCode(204)
  async telegramUnlink(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    await this.customers.telegramUnlink(id, actor.id);
  }
}
