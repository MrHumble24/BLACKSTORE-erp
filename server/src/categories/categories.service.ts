import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttributeType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const attributeSelect = {
  id: true,
  key: true,
  label: true,
  type: true,
  options: true,
  required: true,
  sortOrder: true,
} satisfies Prisma.CategoryAttributeSelect;

const categorySelect = {
  id: true,
  name: true,
  isSerialized: true,
  isActive: true,
  attributes: { select: attributeSelect, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.CategorySelect;

/** Categories and their dynamic attributes (PRD FR-4). Deactivated, never deleted (BR-12). */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Pick-list of categories with attributes sorted by sortOrder; active only unless all=true. */
  findAll(all: boolean) {
    return this.prisma.category.findMany({
      where: all ? {} : { isActive: true },
      select: categorySelect,
      orderBy: { id: 'asc' },
    });
  }

  /** Creates a category. Duplicate name → 409 via the global filter. */
  create(dto: CreateCategoryDto, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: { name: dto.name, isSerialized: dto.isSerialized },
        select: categorySelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'Category', entityId: category.id, after: category },
        tx,
      );
      return category;
    });
  }

  /** Updates a category; refuses to flip isSerialized once stock exists. */
  async update(id: number, dto: UpdateCategoryDto, actorId: number) {
    const before = await this.prisma.category.findUnique({
      where: { id },
      select: categorySelect,
    });
    if (!before) throw new NotFoundException('Category not found');
    return this.prisma.$transaction(async (tx) => {
      await this.assertSerializationChangeAllowed(tx, id, before.isSerialized, dto);
      const category = await tx.category.update({
        where: { id },
        data: dto,
        select: categorySelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'Category', entityId: id, before, after: category },
        tx,
      );
      return category;
    });
  }

  /** 400 if isSerialized would change while the category already has items or accessory stock. */
  private async assertSerializationChangeAllowed(
    tx: Prisma.TransactionClient,
    categoryId: number,
    current: boolean,
    dto: UpdateCategoryDto,
  ) {
    if (dto.isSerialized === undefined || dto.isSerialized === current) return;
    const where = { productModel: { categoryId } };
    const [items, stock] = await Promise.all([
      tx.item.count({ where }),
      tx.accessoryStock.count({ where }),
    ]);
    if (items + stock > 0) {
      throw new BadRequestException(
        'Cannot change isSerialized while the category has items or accessory stock',
      );
    }
  }

  /** Adds an attribute to a category. Duplicate key → 409 via the global filter. */
  async createAttribute(
    categoryId: number,
    dto: CreateAttributeDto,
    actorId: number,
  ) {
    await this.assertCategoryExists(categoryId);
    const options = this.resolveOptions(dto.type, dto.options);
    return this.prisma.$transaction(async (tx) => {
      const attribute = await tx.categoryAttribute.create({
        data: {
          categoryId,
          key: dto.key,
          label: dto.label,
          type: dto.type,
          options,
          required: dto.required,
          sortOrder: dto.sortOrder,
        },
        select: attributeSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'CategoryAttribute', entityId: attribute.id, after: attribute },
        tx,
      );
      return attribute;
    });
  }

  /** Updates an attribute's label, options, required or sortOrder; key and type stay fixed. */
  async updateAttribute(
    categoryId: number,
    attrId: number,
    dto: UpdateAttributeDto,
    actorId: number,
  ) {
    const before = await this.prisma.categoryAttribute.findFirst({
      where: { id: attrId, categoryId },
      select: attributeSelect,
    });
    if (!before) throw new NotFoundException('Attribute not found');
    const options =
      dto.options === undefined
        ? undefined
        : this.resolveOptions(before.type, dto.options);
    return this.prisma.$transaction(async (tx) => {
      const attribute = await tx.categoryAttribute.update({
        where: { id: attrId },
        data: { ...dto, options },
        select: attributeSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'CategoryAttribute', entityId: attrId, before, after: attribute },
        tx,
      );
      return attribute;
    });
  }

  private async assertCategoryExists(categoryId: number) {
    const exists = await this.prisma.category.count({ where: { id: categoryId } });
    if (!exists) throw new NotFoundException('Category not found');
  }

  /** SELECT needs a non-empty options list; every other type stores none. */
  private resolveOptions(type: AttributeType, options?: string[]): string[] {
    if (type === AttributeType.SELECT) {
      if (!options?.length) {
        throw new BadRequestException('SELECT attributes need a non-empty options list');
      }
      return options;
    }
    if (options?.length) {
      throw new BadRequestException('Only SELECT attributes may have options');
    }
    return [];
  }
}
