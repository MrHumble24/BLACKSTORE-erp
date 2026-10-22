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
import { CategoriesService } from './categories.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/** Category pick-list (any user) and management (manage_catalog), including attributes. */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.categories.findAll(query.all);
  }

  @Post()
  @Permissions('manage_catalog')
  create(@Body() dto: CreateCategoryDto, @CurrentUser() actor: PublicUser) {
    return this.categories.create(dto, actor.id);
  }

  @Patch(':id')
  @Permissions('manage_catalog')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.categories.update(id, dto, actor.id);
  }

  @Post(':id/attributes')
  @Permissions('manage_catalog')
  createAttribute(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAttributeDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.categories.createAttribute(id, dto, actor.id);
  }

  @Patch(':id/attributes/:attrId')
  @Permissions('manage_catalog')
  updateAttribute(
    @Param('id', ParseIntPipe) id: number,
    @Param('attrId', ParseIntPipe) attrId: number,
    @Body() dto: UpdateAttributeDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.categories.updateAttribute(id, attrId, dto, actor.id);
  }
}
