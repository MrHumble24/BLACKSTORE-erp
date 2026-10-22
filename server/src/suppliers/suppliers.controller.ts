import {
  Body,
  Controller,
  Get,
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
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SuppliersService } from './suppliers.service';

/** Supplier pick-list (any user) and full management (manage_suppliers). */
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly suppliers: SuppliersService,
    private readonly payments: SupplierPaymentsService,
  ) {}

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.suppliers.findAll(query.all);
  }

  @Get(':id')
  @Permissions('manage_suppliers')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.suppliers.findOne(id, actor);
  }

  @Post()
  @Permissions('manage_suppliers')
  create(@Body() dto: CreateSupplierDto, @CurrentUser() actor: PublicUser) {
    return this.suppliers.create(dto, actor);
  }

  @Patch(':id')
  @Permissions('manage_suppliers')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.suppliers.update(id, dto, actor);
  }

  @Get(':id/payments')
  @Permissions('manage_suppliers')
  findPayments(@Param('id', ParseIntPipe) id: number, @Query() query: PaginationQueryDto) {
    return this.payments.findAll(id, query);
  }

  @Post(':id/payments')
  @Permissions('manage_suppliers')
  createPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.payments.create(id, dto, actor.id);
  }
}
