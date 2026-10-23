import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { ConsignmentSellService } from './consignment-sell.service';
import { ConsignmentsService } from './consignments.service';
import { CreateConsignmentDto } from './dto/create-consignment.dto';
import { QueryConsignmentsDto } from './dto/query-consignments.dto';
import { SellConsignmentItemDto } from './dto/sell-consignment-item.dto';
import { UpdateConsignmentDto } from './dto/update-consignment.dto';
import { UpdateConsignmentItemDto } from './dto/update-consignment-item.dto';

/** HTTP for consignments (FR-26, W4); `consign` by default, selling needs `sell`. */
@Controller('consignments')
@Permissions('consign')
export class ConsignmentsController {
  constructor(
    private readonly consignments: ConsignmentsService,
    private readonly sellService: ConsignmentSellService,
  ) {}

  @Post()
  create(@Body() dto: CreateConsignmentDto, @CurrentUser() actor: PublicUser) {
    return this.consignments.create(dto, actor);
  }

  @Get()
  findAll(@Query() query: QueryConsignmentsDto) {
    return this.consignments.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.consignments.findOne(id);
  }

  @Patch(':id')
  updateDueDate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConsignmentDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.consignments.updateDueDate(id, dto, actor.id);
  }

  @Patch(':id/items/:itemId')
  updateItemMinPrice(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateConsignmentItemDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.consignments.updateItemMinPrice(id, itemId, dto, actor);
  }

  @Post(':id/items/:itemId/sell')
  @Permissions('sell')
  sell(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: SellConsignmentItemDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.sellService.sell(id, itemId, dto, actor.id);
  }

  @Post(':id/items/:itemId/return')
  returnItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.consignments.returnItem(id, itemId, actor.id);
  }
}
