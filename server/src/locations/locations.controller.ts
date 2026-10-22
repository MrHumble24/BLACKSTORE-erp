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
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

/** Location pick-list (any user) and management (manage_catalog). */
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.locations.findAll(query.all);
  }

  @Post()
  @Permissions('manage_catalog')
  create(@Body() dto: CreateLocationDto, @CurrentUser() actor: PublicUser) {
    return this.locations.create(dto, actor.id);
  }

  @Patch(':id')
  @Permissions('manage_catalog')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.locations.update(id, dto, actor.id);
  }
}
