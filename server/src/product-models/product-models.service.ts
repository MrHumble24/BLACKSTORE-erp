import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductModelDto } from './dto/create-product-model.dto';
import { QueryProductModelDto } from './dto/query-product-model.dto';
import { UpdateProductModelDto } from './dto/update-product-model.dto';

// lowStockThreshold is intentionally omitted (Phase 2, not exposed yet).
const modelSelect = {
  id: true,
  categoryId: true,
  name: true,
  isActive: true,
} satisfies Prisma.ProductModelSelect;

/** Product models (PRD FR-4). Deactivated, never deleted (BR-12). */
@Injectable()
export class ProductModelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Pick-list of models; active only unless all=true, optionally filtered by category. */
  findAll({ all, categoryId }: QueryProductModelDto) {
    return this.prisma.productModel.findMany({
      where: { ...(all ? {} : { isActive: true }), categoryId },
      select: modelSelect,
      orderBy: { id: 'asc' },
    });
  }

  /** Creates a model. Duplicate (category, name) → 409 via the global filter. */
  create(dto: CreateProductModelDto, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const model = await tx.productModel.create({
        data: dto,
        select: modelSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'ProductModel', entityId: model.id, after: model },
        tx,
      );
      return model;
    });
  }

  /** Updates a model's name or active flag; category never changes. */
  async update(id: number, dto: UpdateProductModelDto, actorId: number) {
    const before = await this.prisma.productModel.findUnique({
      where: { id },
      select: modelSelect,
    });
    if (!before) throw new NotFoundException('Product model not found');
    return this.prisma.$transaction(async (tx) => {
      const model = await tx.productModel.update({
        where: { id },
        data: dto,
        select: modelSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'ProductModel', entityId: id, before, after: model },
        tx,
      );
      return model;
    });
  }
}
