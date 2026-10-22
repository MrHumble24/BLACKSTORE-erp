import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { CodeParamDto } from './dto/code-param.dto';
import { CreateIdentifierDto } from './dto/create-identifier.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { UpdateItemPricesDto } from './dto/update-item-prices.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

/** HTTP for serialized devices: list, scan, create, edit, prices and identifiers. */
@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get()
  @Permissions('view_stock')
  findAll(@Query() query: QueryItemsDto, @CurrentUser() actor: PublicUser) {
    return this.items.findAll(query, actor);
  }

  // Before :id so the literal path wins over the numeric param.
  @Get('by-code/:code')
  @Permissions('view_stock')
  findByCode(@Param() params: CodeParamDto, @CurrentUser() actor: PublicUser) {
    return this.items.findByCode(params.code, actor);
  }

  @Get(':id')
  @Permissions('view_stock')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.items.findOne(id, actor);
  }

  @Post()
  @Permissions('receive_batch')
  create(@Body() dto: CreateItemDto, @CurrentUser() actor: PublicUser) {
    return this.items.create(dto, actor);
  }

  @Patch(':id')
  @Permissions('receive_batch')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.items.update(id, dto, actor);
  }

  @Patch(':id/prices')
  @Permissions('manage_prices')
  updatePrices(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemPricesDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.items.updatePrices(id, dto, actor);
  }

  @Post(':id/identifiers')
  @Permissions('receive_batch')
  addIdentifier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateIdentifierDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.items.addIdentifier(id, dto, actor);
  }

  // 201 when the label code is first created, 200 when the item already had one (FR-15).
  @Post(':id/system-code')
  @Permissions('receive_batch')
  async systemCode(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: PublicUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { identifier, created } = await this.items.setSystemCode(id, actor);
    res.status(created ? 201 : 200);
    return identifier;
  }
}
