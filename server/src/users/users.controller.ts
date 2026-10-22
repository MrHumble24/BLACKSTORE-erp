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
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

/** User management (list, create, update); requires the manage_users permission. */
@Controller('users')
@Permissions('manage_users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.users.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: PublicUser) {
    return this.users.create(dto, actor.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.users.update(id, dto, actor.id);
  }
}
