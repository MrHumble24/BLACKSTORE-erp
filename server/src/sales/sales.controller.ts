import {
  Body,
  Controller,
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
import { ConfirmSalesDto } from './dto/confirm-sales.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateSalePaymentDto } from './dto/create-sale-payment.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { SaleConfirmationService } from './sale-confirmation.service';
import { SalePaymentsService } from './sale-payments.service';
import { SaleReturnsService } from './sale-returns.service';
import { SalesService } from './sales.service';

/** HTTP for sales, their payments, returns and close-day confirmation (PRD FR-19–FR-23, F33). */
@Controller('sales')
export class SalesController {
  constructor(
    private readonly sales: SalesService,
    private readonly payments: SalePaymentsService,
    private readonly returns: SaleReturnsService,
    private readonly confirmation: SaleConfirmationService,
  ) {}

  @Get()
  @Permissions('sell')
  findAll(@Query() query: QuerySalesDto) {
    return this.sales.findAll(query);
  }

  // Declared before the ':id' routes so "confirm" is never parsed as an id.
  @Patch('confirm')
  @Permissions('close_day')
  confirmMany(@Body() dto: ConfirmSalesDto, @CurrentUser() actor: PublicUser) {
    return this.confirmation.confirmMany(dto.ids, actor);
  }

  @Patch(':id/confirm')
  @Permissions('close_day')
  confirm(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.confirmation.confirm(id, actor);
  }

  @Patch(':id/unconfirm')
  @Permissions('close_day')
  unconfirm(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.confirmation.unconfirm(id, actor);
  }

  @Get(':id')
  @Permissions('sell')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.sales.findOne(id, actor);
  }

  @Post()
  @Permissions('sell')
  create(@Body() dto: CreateSaleDto, @CurrentUser() actor: PublicUser) {
    return this.sales.create(dto, actor);
  }

  // Returns the updated sale (200); a payment is not a new top-level resource.
  @Post(':id/payments')
  @HttpCode(200)
  @Permissions('record_payment')
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSalePaymentDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.payments.create(id, dto, actor);
  }

  @Post(':id/returns')
  @Permissions('sell')
  addReturn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReturnDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.returns.create(id, dto, actor);
  }
}
