import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateSalePaymentDto } from './dto/create-sale-payment.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { SalePaymentsService } from './sale-payments.service';
import { SaleReturnsService } from './sale-returns.service';
import { SalesService } from './sales.service';

/** HTTP for sales, their payments and returns (PRD FR-19–FR-23). */
@Controller('sales')
export class SalesController {
  constructor(
    private readonly sales: SalesService,
    private readonly payments: SalePaymentsService,
    private readonly returns: SaleReturnsService,
  ) {}

  @Get()
  @Permissions('sell')
  findAll(@Query() query: QuerySalesDto) {
    return this.sales.findAll(query);
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
