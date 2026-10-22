import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { hasPermission } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

const summarySelect = {
  id: true,
  name: true,
  country: true,
  isActive: true,
} satisfies Prisma.SupplierSelect;

const fullSelect = { ...summarySelect, phone: true, note: true } satisfies Prisma.SupplierSelect;

type FullSupplier = Prisma.SupplierGetPayload<{ select: typeof fullSelect }>;

/** Suppliers and their owed balance (PRD FR-14, FR-17). Balance is computed on read (BR-8). */
@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Summary pick-list; active only unless all=true. */
  async findAll(all: boolean) {
    return this.prisma.supplier.findMany({
      where: all ? {} : { isActive: true },
      select: summarySelect,
      orderBy: { name: 'asc' },
    });
  }

  /** Full supplier with the computed balance; 404 if missing. */
  async findOne(id: number, actor: PublicUser) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id }, select: fullSelect });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return this.withBalance(supplier, actor);
  }

  /** Creates a supplier; duplicate name → 409 via the Prisma exception filter. */
  async create(dto: CreateSupplierDto, actor: PublicUser) {
    const created = await this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({ data: dto, select: fullSelect });
      await this.audit.log(
        { userId: actor.id, action: 'create', entity: 'Supplier', entityId: supplier.id, after: supplier },
        tx,
      );
      return supplier;
    });
    return this.withBalance(created, actor);
  }

  /** Updates a supplier; duplicate name → 409. */
  async update(id: number, dto: UpdateSupplierDto, actor: PublicUser) {
    const before = await this.prisma.supplier.findUnique({ where: { id }, select: fullSelect });
    if (!before) throw new NotFoundException('Supplier not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.update({ where: { id }, data: dto, select: fullSelect });
      await this.audit.log(
        { userId: actor.id, action: 'update', entity: 'Supplier', entityId: id, before, after: supplier },
        tx,
      );
      return supplier;
    });
    return this.withBalance(updated, actor);
  }

  /**
   * Balance (BR-8) = Σ(unitPrice × quantity) over the supplier's batch lines − Σ payments.amount.
   * The product can't be a single Prisma aggregate, so lines are summed in memory; transfer
   * fees are excluded as they never reach the supplier. Hidden without view_cost.
   */
  private async withBalance(supplier: FullSupplier, actor: PublicUser) {
    if (!hasPermission(actor, 'view_cost')) return supplier;
    const [lines, paid] = await this.prisma.$transaction([
      this.prisma.purchaseLine.findMany({
        where: { batch: { supplierId: supplier.id } },
        select: { unitPrice: true, quantity: true },
      }),
      this.prisma.supplierPayment.aggregate({
        where: { supplierId: supplier.id },
        _sum: { amount: true },
      }),
    ]);
    const owed = lines.reduce(
      (sum, l) => sum.plus(l.unitPrice.times(l.quantity)),
      new Prisma.Decimal(0),
    );
    const { _sum } = paid;
    const balance = owed.minus(_sum.amount ?? new Prisma.Decimal(0));
    return { ...supplier, balance: balance.toFixed(2) };
  }
}
