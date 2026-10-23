import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CostSplitMethod, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { parsePastDate } from '../common/dates';
import { hasPermission } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { assertActive } from '../items/item-queries';
import { assertBatchEditable } from './batch-lock';
import { batchDetailSelect, batchSummarySelect, toBatch, toBatchSummary } from './batch-shape';
import { CreateBatchDto } from './dto/create-batch.dto';
import { QueryBatchesDto } from './dto/query-batches.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { applyResplit } from './extra-cost-split';

/** Supplier batches: header create/list/read/edit (PRD FR-16, FR-18). Lines live in BatchLinesService. */
@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Paginated, newest-first list, optionally filtered by supplier. */
  async findAll(query: QueryBatchesDto, actor: PublicUser) {
    const where: Prisma.BatchWhereInput = { supplierId: query.supplierId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.batch.findMany({
        where,
        select: batchSummarySelect,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.batch.count({ where }),
    ]);
    const canViewCost = hasPermission(actor, 'view_cost');
    return {
      items: rows.map((row) => toBatchSummary(row, canViewCost)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** One batch with its lines; 404 if missing. */
  async findOne(id: number, actor: PublicUser) {
    const row = await this.prisma.batch.findUnique({ where: { id }, select: batchDetailSelect });
    if (!row) throw new NotFoundException('Batch not found');
    return toBatch(row, hasPermission(actor, 'view_cost'));
  }

  /** Creates a batch; supplier, investor and location must all be active (400 otherwise). */
  async create(dto: CreateBatchDto, actor: PublicUser) {
    await this.assertActiveRefs(dto);
    const created = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          supplierId: dto.supplierId,
          investorId: dto.investorId,
          locationId: dto.locationId,
          arrivalDate: parsePastDate(dto.arrivalDate) ?? new Date(),
          note: dto.note,
        },
        select: batchSummarySelect,
      });
      await this.audit.log(
        { userId: actor.id, action: 'create', entity: 'Batch', entityId: batch.id, after: batch },
        tx,
      );
      return batch;
    });
    return toBatchSummary(created, hasPermission(actor, 'view_cost'));
  }

  /** Edits the header; extraCostTotal/costSplitMethod need manage_prices and re-split the lines. */
  async update(id: number, dto: UpdateBatchDto, actor: PublicUser) {
    const touchesCost = dto.extraCostTotal !== undefined || dto.costSplitMethod !== undefined;
    if (touchesCost && !hasPermission(actor, 'manage_prices')) {
      throw new ForbiddenException('Changing extra costs requires the manage_prices permission');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.batch.findUnique({ where: { id }, select: batchDetailSelect });
      if (!before) throw new NotFoundException('Batch not found');
      assertBatchEditable(before, actor);
      this.assertSplitChosen(dto, before);
      await tx.batch.update({
        where: { id },
        data: {
          arrivalDate: parsePastDate(dto.arrivalDate),
          note: dto.note,
          extraCostTotal: dto.extraCostTotal ? new Prisma.Decimal(dto.extraCostTotal) : undefined,
          costSplitMethod: dto.costSplitMethod,
        },
      });
      if (touchesCost) await applyResplit(tx, id);
      const after = await tx.batch.findUniqueOrThrow({ where: { id }, select: batchDetailSelect });
      await this.audit.log(
        { userId: actor.id, action: 'update', entity: 'Batch', entityId: id, before, after },
        tx,
      );
      return after;
    });
    return toBatch(updated, hasPermission(actor, 'view_cost'));
  }

  /** 400 when the resulting extra cost is > 0 but no split method is chosen (FR-18). */
  private assertSplitChosen(
    dto: UpdateBatchDto,
    current: { extraCostTotal: Prisma.Decimal; costSplitMethod: CostSplitMethod },
  ) {
    const total =
      dto.extraCostTotal !== undefined ? new Prisma.Decimal(dto.extraCostTotal) : current.extraCostTotal;
    const method = dto.costSplitMethod ?? current.costSplitMethod;
    if (total.greaterThan(0) && method === CostSplitMethod.NONE) {
      throw new BadRequestException(
        'Choose how to split the extra cost (EQUAL or BY_PRICE) or set it to 0',
      );
    }
  }

  /** 400 if the supplier, investor or location is inactive or missing. */
  private async assertActiveRefs(dto: CreateBatchDto) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
      select: { isActive: true },
    });
    if (!supplier?.isActive) throw new BadRequestException('Supplier is inactive or does not exist');
    // Investor/location checks are shared with item receive (DRY).
    await assertActive(this.prisma, dto.investorId, dto.locationId);
  }
}
