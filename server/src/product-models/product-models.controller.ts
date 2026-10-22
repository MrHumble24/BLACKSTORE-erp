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
import { CreateProductModelDto } from './dto/create-product-model.dto';
import { QueryProductModelDto } from './dto/query-product-model.dto';
import { UpdateProductModelDto } from './dto/update-product-model.dto';
import { ProductModelsService } from './product-models.service';

/** Product-model pick-list (any user) and management (manage_catalog). */
@Controller('product-models')
export class ProductModelsController {
  constructor(private readonly models: ProductModelsService) {}

  @Get()
  findAll(@Query() query: QueryProductModelDto) {
    return this.models.findAll(query);
  }

  @Post()
  @Permissions('manage_catalog')
  create(@Body() dto: CreateProductModelDto, @CurrentUser() actor: PublicUser) {
    return this.models.create(dto, actor.id);
  }

  @Patch(':id')
  @Permissions('manage_catalog')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductModelDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.models.update(id, dto, actor.id);
  }
}
