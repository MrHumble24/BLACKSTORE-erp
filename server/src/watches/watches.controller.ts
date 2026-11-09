import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { CreateWatchDto } from './dto/create-watch.dto';
import { UpdateWatchDto } from './dto/update-watch.dto';
import { WatchSyncService } from './watch-sync.service';
import { WatchesService } from './watches.service';

/** HTTP for Watcher watches (F34); Admin and SuperAdmin only (`manage_watches`). */
@Controller('watches')
@Permissions('manage_watches')
export class WatchesController {
  constructor(
    private readonly watches: WatchesService,
    private readonly sync: WatchSyncService,
  ) {}

  @Get()
  findMany(@Query() query: PaginationQueryDto) {
    return this.watches.findMany(query);
  }

  /** `{ configured, unsynced, reachable, lastOkAt }`: Watcher setup, pending pushes and heartbeat. */
  @Get('sync-status')
  syncStatus() {
    return this.sync.status();
  }

  @Post()
  create(@Body() dto: CreateWatchDto, @CurrentUser() actor: PublicUser) {
    return this.watches.create(dto, actor.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWatchDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.watches.update(id, dto, actor.id);
  }
}
