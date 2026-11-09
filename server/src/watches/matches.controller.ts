import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { QueryMatchesDto } from './dto/query-matches.dto';
import { ChangeMatchStatusDto, UpdateMatchDto } from './dto/update-match.dto';
import { MatchesService } from './matches.service';

/** HTTP for Watcher matches (F34); Admin and SuperAdmin only. No POST: the webhook creates rows. */
@Controller('matches')
@Permissions('manage_watches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get()
  findMany(@Query() query: QueryMatchesDto) {
    return this.matches.findMany(query);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeMatchStatusDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.matches.changeStatus(id, dto.status, actor.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMatchDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.matches.updateNote(id, dto.note, actor.id);
  }
}
