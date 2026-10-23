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
import { BatchLinesService } from './batch-lines.service';
import { BatchesService } from './batches.service';
import { CreateBatchAccessoryDto } from './dto/create-batch-accessory.dto';
import { CreateBatchItemDto } from './dto/create-batch-item.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { QueryBatchesDto } from './dto/query-batches.dto';
import { RepriceModelDto } from './dto/reprice-model.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { UpdateLineDto } from './dto/update-line.dto';

/** HTTP for supplier batches and their lines (PRD FR-16, FR-18). */
@Controller('batches')
export class BatchesController {
  constructor(
    private readonly batches: BatchesService,
    private readonly lines: BatchLinesService,
  ) {}

  @Get()
  @Permissions('receive_batch')
  findAll(@Query() query: QueryBatchesDto, @CurrentUser() actor: PublicUser) {
    return this.batches.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('receive_batch')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.batches.findOne(id, actor);
  }

  @Post()
  @Permissions('receive_batch')
  create(@Body() dto: CreateBatchDto, @CurrentUser() actor: PublicUser) {
    return this.batches.create(dto, actor);
  }

  @Patch(':id')
  @Permissions('receive_batch')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBatchDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.batches.update(id, dto, actor);
  }

  @Post(':id/items')
  @Permissions('receive_batch')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBatchItemDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.lines.addItem(id, dto, actor);
  }

  @Post(':id/accessories')
  @Permissions('receive_batch')
  addAccessory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBatchAccessoryDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.lines.addAccessory(id, dto, actor);
  }

  @Patch(':id/lines/:lineId')
  @Permissions('manage_prices')
  updateLine(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: UpdateLineDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.lines.updateLine(id, lineId, dto, actor);
  }

  @Patch(':id/lines')
  @Permissions('manage_prices')
  repriceModel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RepriceModelDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.lines.repriceModel(id, dto, actor);
  }

  @Delete(':id/lines/:lineId')
  @Permissions('delete_records')
  @HttpCode(204)
  removeLine(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.lines.removeLine(id, lineId, actor);
  }
}
