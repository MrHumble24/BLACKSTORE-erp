import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { AccessoryStockService } from './accessory-stock.service';
import { CreateAccessoryStockDto } from './dto/create-accessory-stock.dto';
import { QueryAccessoryStockDto } from './dto/query-accessory-stock.dto';

/** HTTP for quantity-based accessory stock. */
@Controller('accessory-stock')
export class AccessoryStockController {
  constructor(private readonly stock: AccessoryStockService) {}

  @Get()
  @Permissions('view_stock')
  findAll(@Query() query: QueryAccessoryStockDto, @CurrentUser() actor: PublicUser) {
    return this.stock.findAll(query, actor);
  }

  @Post()
  @Permissions('receive_batch')
  create(@Body() dto: CreateAccessoryStockDto, @CurrentUser() actor: PublicUser) {
    return this.stock.create(dto, actor);
  }
}
