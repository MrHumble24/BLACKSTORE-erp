import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { QueryTransfersDto } from './dto/query-transfers.dto';
import { TransfersService } from './transfers.service';

/** HTTP for stock transfers between locations. */
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  @Permissions('view_stock')
  findAll(@Query() query: QueryTransfersDto) {
    return this.transfers.findAll(query);
  }

  @Get(':id')
  @Permissions('view_stock')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transfers.findOne(id);
  }

  @Post()
  @Permissions('transfer_stock')
  create(@Body() dto: CreateTransferDto, @CurrentUser() actor: PublicUser) {
    return this.transfers.create(dto, actor);
  }
}
