import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
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
  telegramLink(@Param('id', ParseIntPipe) id: number) {
    return this.customers.telegramLink(id);
  }
}
