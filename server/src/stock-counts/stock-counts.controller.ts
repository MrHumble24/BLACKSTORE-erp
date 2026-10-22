import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateStockCountDto } from './dto/create-stock-count.dto';
import { QueryStockCountsDto } from './dto/query-stock-counts.dto';
import { StockCountsService } from './stock-counts.service';

/** HTTP for physical stock counts. Every route needs the stock_count permission. */
@Controller('stock-counts')
@Permissions('stock_count')
export class StockCountsController {
  constructor(private readonly counts: StockCountsService) {}

  @Get()
  findAll(@Query() query: QueryStockCountsDto) {
    return this.counts.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.counts.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStockCountDto, @CurrentUser() actor: PublicUser) {
    return this.counts.create(dto, actor);
  }

  /** 201 for a new scan, 200 when the code was already scanned (DUPLICATE). */
  @Post(':id/scans')
  @HttpCode(201)
  async scan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateScanDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const scan = await this.counts.scan(id, dto);
    if (scan.status === 'DUPLICATE') res.status(200);
    return scan;
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: PublicUser) {
    return this.counts.finish(id, actor);
  }
}
