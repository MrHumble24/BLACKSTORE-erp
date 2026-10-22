import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemStatus, Prisma, SaleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { endOfDay, parseTodayOrFutureDate } from '../common/dates';
import { hasPermission } from '../common/permissions';
import { assertActiveLocation } from '../items/item-queries';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { BuiltLine, buildLine } from './sale-create';
import { saleDetailSelect, saleSummarySelect, toSale, toSaleSummary } from './sale-shape';

type Tx = Prisma.TransactionClient;

/** Sales: list, read and create (PRD FR-19–FR-21, W2). Payments and returns live in their own services. */
@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly items: ItemsService,
  ) {}

  /** Paginated, newest-first customer sales; `to` is inclusive of that day. */
  async findAll(query: QuerySalesDto) {
    const createdAt =
      query.from || query.to
        ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? endOfDay(query.to) : undefined }
        : undefined;
    const where: Prisma.SaleWhereInput = {
      partnerId: null, // partner-shop sales are F06, not this list
      status: query.status,
      customerId: query.customerId,
      locationId: query.locationId,
      createdAt,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        select: saleSummarySelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { items: rows.map(toSaleSummary), total, page: query.page, pageSize: query.pageSize };
  }

  /** One sale with its lines, payments and returns; 404 if missing. */
  async findOne(id: number, actor: PublicUser) {
    const row = await this.prisma.sale.findUnique({ where: { id }, select: saleDetailSelect });
    if (!row) throw new NotFoundException('Sale not found');
    return toSale(row, hasPermission(actor, 'view_cost'));
  }

  /** Creates a sale in one transaction: validate lines, snapshot, move stock, optional payment (W2). */
  async create(dto: CreateSaleDto, actor: PublicUser) {
    const canManagePrices = hasPermission(actor, 'manage_prices');
    this.assertNoDuplicateModels(dto);
    const detail = await this.prisma.$transaction(async (tx) => {
      await assertActiveLocation(tx, dto.locationId);
      // Build lines sequentially: inside one transaction queries share a connection and must not interleave.
      const built: BuiltLine[] = [];
      for (const line of dto.lines) {
        // eslint-disable-next-line no-await-in-loop -- sequential by design (single tx connection)
        built.push(await buildLine(tx, line, dto.locationId, canManagePrices));
      }
      const total = built.reduce((sum, b) => sum.plus(b.lineTotal), new Prisma.Decimal(0));
      const { status, paymentAmount } = this.resolvePayment(dto, total);
      if (status === SaleStatus.DEBT && dto.customerId == null) {
        throw new BadRequestException('A debt sale needs a customer');
      }
      const sale = await tx.sale.create({
        data: {
          customerId: dto.customerId,
          locationId: dto.locationId,
          sellerId: actor.id,
          status,
          total,
          dueDate: status === SaleStatus.DEBT ? parseTodayOrFutureDate(dto.dueDate) : null,
        },
        select: { id: true },
      });
      await tx.saleItem.createMany({ data: built.map((b) => ({ ...b.data, saleId: sale.id })) });
      if (dto.payment && paymentAmount) {
        await tx.salePayment.create({
          data: { saleId: sale.id, amount: paymentAmount, method: dto.payment.method, receivedBy: actor.id },
        });
      }
      await this.applyStockMoves(tx, built, status);
      const after = await tx.sale.findUniqueOrThrow({ where: { id: sale.id }, select: saleDetailSelect });
      await this.audit.log(
        { userId: actor.id, action: 'create', entity: 'Sale', entityId: sale.id, after },
        tx,
      );
      return after;
    });
    return toSale(detail, hasPermission(actor, 'view_cost'));
  }

  /** Moves device items to SOLD/DEBT and lowers accessory stock for every built line. */
  private async applyStockMoves(tx: Tx, built: BuiltLine[], status: SaleStatus): Promise<void> {
    const deviceStatus = status === SaleStatus.PAID ? ItemStatus.SOLD : ItemStatus.DEBT;
    for (const b of built) {
      // eslint-disable-next-line no-await-in-loop -- sequential by design (single tx connection)
      await this.applyLineMove(tx, b, deviceStatus);
    }
  }

  /** The stock move for one built line: a device status change and/or an accessory decrement. */
  private async applyLineMove(tx: Tx, b: BuiltLine, deviceStatus: ItemStatus): Promise<void> {
    if (b.moveItemId) await this.items.changeStatus(tx, b.moveItemId, deviceStatus);
    if (b.decrement) await this.decrementStock(tx, b.decrement);
  }

  /** Atomic stock decrement: the `gte` guard rejects overselling even under concurrent sales (BR). */
  private async decrementStock(tx: Tx, d: NonNullable<BuiltLine['decrement']>): Promise<void> {
    const result = await tx.accessoryStock.updateMany({
      where: {
        productModelId: d.productModelId,
        locationId: d.locationId,
        quantity: { gte: d.quantity },
      },
      data: { quantity: { decrement: d.quantity } },
    });
    if (result.count === 0) {
      throw new BadRequestException(`Not enough stock for product model #${d.productModelId}`);
    }
  }

  /** Two lines of the same accessory model would each read, then decrement together; reject up front. */
  private assertNoDuplicateModels(dto: CreateSaleDto): void {
    const modelIds = dto.lines.filter((l) => l.productModelId != null).map((l) => l.productModelId);
    if (new Set(modelIds).size !== modelIds.length) {
      throw new BadRequestException('Combine lines of the same product model into one line');
    }
  }

  /** Resolves the optional sale-time payment: amount must be 0 < amount ≤ total; PAID only when it equals total. */
  private resolvePayment(dto: CreateSaleDto, total: Prisma.Decimal) {
    if (!dto.payment) return { status: SaleStatus.DEBT, paymentAmount: null };
    const amount = new Prisma.Decimal(dto.payment.amount);
    if (!amount.isPositive()) throw new BadRequestException('payment amount must be greater than 0');
    if (amount.gt(total)) throw new BadRequestException('payment amount cannot exceed the sale total');
    const status = amount.equals(total) ? SaleStatus.PAID : SaleStatus.DEBT;
    return { status, paymentAmount: amount };
  }
}
