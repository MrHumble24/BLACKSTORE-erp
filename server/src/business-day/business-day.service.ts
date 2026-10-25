import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DayStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { computeExpected } from './business-day.reconcile';
import { CloseDayDto, FlagInputDto } from './dto/close-day.dto';
import { UpdateBusinessDayDto } from './dto/update-business-day.dto';

type Tx = Prisma.TransactionClient;
type DbClient = PrismaService | Tx;

// Window rows: everything the reconciliation (drawer math) and the review lists need in one pass.
const paymentSelect = { id: true, amount: true, method: true } satisfies Prisma.SalePaymentSelect;
const ledgerSelect = { id: true, category: true, amount: true, inCash: true, type: true, status: true } satisfies Prisma.LedgerEntrySelect;
const saleSelect = { id: true, total: true, createdAt: true, seller: { select: { id: true, name: true } } } satisfies Prisma.SaleSelect;
const returnSelect = {
  id: true,
  refundAmount: true,
  cashRefund: true,
  reason: true,
  user: { select: { id: true, name: true } },
  saleItem: { select: { productModel: { select: { name: true } }, item: { select: { identifiers: { select: { value: true }, take: 1 } } } } },
} satisfies Prisma.ReturnSelect;

// Frozen snapshot fields returned for a closed day.
const daySelect = {
  id: true, openedAt: true, closedAt: true, status: true, note: true,
  expectedCash: true, countedCash: true, cashVariance: true,
  expectedCard: true, countedCard: true, cardVariance: true,
  closedBy: { select: { id: true, name: true } },
} satisfies Prisma.BusinessDaySelect;

/** Daily close / reconciliation (F13). Owner-only (close_day); anti-fraud drawer counting with flags. */
@Injectable()
export class BusinessDayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The current OPEN day with live expected cash/card and the review lists for its window. */
  async getCurrent() {
    const day = await this.openDayOrThrow(this.prisma);
    const win = await this.loadWindow(this.prisma, day.openedAt);
    const { expectedCash, expectedCard, paymentsCash, paymentsCard } = computeExpected(win);
    return {
      day: { id: day.id, openedAt: day.openedAt.toISOString() },
      expectedCash: expectedCash.toFixed(2),
      expectedCard: expectedCard.toFixed(2),
      payments: { cash: paymentsCash.toFixed(2), card: paymentsCard.toFixed(2) },
      sales: win.sales.map((s) => ({ id: s.id, seller: s.seller, total: s.total.toFixed(2), time: s.createdAt.toISOString() })),
      returns: win.returns.map(toReturnRow),
      expenses: win.ledger.filter((l) => l.type === 'EXPENSE').map(toLedgerRow),
      income: win.ledger.filter((l) => l.type === 'INCOME').map(toLedgerRow),
    };
  }

  /**
   * Closes the current day in ONE transaction: freezes the expected/counted/variance snapshot,
   * records flags, auto-opens the next day, and audits the close, the auto-open and every flag.
   * The updateMany-expects-1-row guard makes a concurrent double-close fail cleanly.
   */
  async close(dto: CloseDayDto, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      const day = await this.openDayOrThrow(tx);
      const closedAt = new Date();
      const expected = computeExpected(await this.loadWindow(tx, day.openedAt, closedAt));

      const countedCash = new Prisma.Decimal(dto.countedCash);
      const countedCard = new Prisma.Decimal(dto.countedCard);
      const snapshot = {
        status: DayStatus.CLOSED,
        closedAt,
        closedById: actor.id,
        note: dto.note ?? null,
        expectedCash: expected.expectedCash,
        countedCash,
        cashVariance: countedCash.minus(expected.expectedCash),
        expectedCard: expected.expectedCard,
        countedCard,
        cardVariance: countedCard.minus(expected.expectedCard),
      };

      // Atomic single-close: only the first updateMany sees status=OPEN; a racing close gets count 0.
      const { count } = await tx.businessDay.updateMany({ where: { id: day.id, status: DayStatus.OPEN }, data: snapshot });
      if (count !== 1) throw new ConflictException('The day is already closed');

      await this.createFlags(tx, day.id, dto.flags, actor);
      const nextDay = await tx.businessDay.create({ data: { openedAt: closedAt }, select: { id: true, openedAt: true, status: true } });
      const closed = await tx.businessDay.findUniqueOrThrow({ where: { id: day.id }, select: daySelect });

      await this.audit.log({ userId: actor.id, action: 'close', entity: 'BusinessDay', entityId: day.id, before: { id: day.id, status: DayStatus.OPEN }, after: closed }, tx);
      await this.audit.log({ userId: actor.id, action: 'create', entity: 'BusinessDay', entityId: nextDay.id, after: nextDay }, tx);
      return toDay(closed);
    });
  }

  /** CLOSED days only, newest close first, paginated (F28 history). */
  async findClosed(query: PaginationQueryDto) {
    const where = { status: DayStatus.CLOSED };
    const [rows, total] = await Promise.all([
      this.prisma.businessDay.findMany({
        where,
        select: daySelect,
        orderBy: { closedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.businessDay.count({ where }),
    ]);
    return { items: rows.map(toDay), total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * Admin correction of a CLOSED day's counted values / note (F28). Expected values stay frozen;
   * variances are recomputed from the stored expected snapshot. Audited with before/after (FR-30).
   */
  async update(id: number, dto: UpdateBusinessDayDto, actor: PublicUser) {
    if (dto.countedCash === undefined && dto.countedCard === undefined && dto.note === undefined) {
      throw new BadRequestException('Nothing to update');
    }
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.businessDay.findUnique({ where: { id }, select: daySelect });
      if (!before) throw new NotFoundException('Business day not found');
      if (before.status !== DayStatus.CLOSED) throw new ConflictException('Only a closed day can be edited');

      const data: Prisma.BusinessDayUpdateInput = {};
      if (dto.countedCash !== undefined) {
        const counted = new Prisma.Decimal(dto.countedCash);
        data.countedCash = counted;
        data.cashVariance = counted.minus(before.expectedCash ?? 0);
      }
      if (dto.countedCard !== undefined) {
        const counted = new Prisma.Decimal(dto.countedCard);
        data.countedCard = counted;
        data.cardVariance = counted.minus(before.expectedCard ?? 0);
      }
      if (dto.note !== undefined) data.note = dto.note;

      const after = await tx.businessDay.update({ where: { id }, data, select: daySelect });
      await this.audit.log({ userId: actor.id, action: 'update', entity: 'BusinessDay', entityId: id, before, after }, tx);
      return toDay(after);
    });
  }

  /** Marks a flag resolved and audits the update. */
  async resolveFlag(id: number, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.dayCloseFlag.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Flag not found');
      const after = await tx.dayCloseFlag.update({
        where: { id },
        data: { resolved: true, resolvedById: actor.id, resolvedAt: new Date() },
      });
      await this.audit.log({ userId: actor.id, action: 'update', entity: 'DayCloseFlag', entityId: id, before, after }, tx);
      return after;
    });
  }

  /** The single OPEN day; the partial unique index guarantees there is at most one. */
  private async openDayOrThrow(client: DbClient) {
    const day = await client.businessDay.findFirst({ where: { status: DayStatus.OPEN }, select: { id: true, openedAt: true } });
    if (!day) throw new ConflictException('No open business day');
    return day;
  }

  /** Loads all records in the half-open window [openedAt, closedAt) keyed on the immutable createdAt. */
  private async loadWindow(client: DbClient, openedAt: Date, closedAt?: Date) {
    const createdAt = { gte: openedAt, ...(closedAt ? { lt: closedAt } : {}) };
    const [payments, ledger, sales, returns] = await Promise.all([
      client.salePayment.findMany({ where: { createdAt }, select: paymentSelect }),
      client.ledgerEntry.findMany({ where: { createdAt }, select: ledgerSelect }),
      client.sale.findMany({ where: { createdAt }, select: saleSelect, orderBy: { id: 'desc' } }),
      client.return.findMany({ where: { createdAt }, select: returnSelect, orderBy: { id: 'desc' } }),
    ]);
    return { payments, ledger, sales, returns };
  }

  /** Persists the owner's flags for the closed day. */
  private async createFlags(tx: Tx, businessDayId: number, flags: FlagInputDto[] | undefined, actor: PublicUser) {
    for (const flag of flags ?? []) {
      // eslint-disable-next-line no-await-in-loop -- sequential by design (single tx connection)
      const row = await tx.dayCloseFlag.create({ data: { businessDayId, refType: flag.refType, refId: flag.refId, reason: flag.reason } });
      // eslint-disable-next-line no-await-in-loop -- sequential by design (single tx connection)
      await this.audit.log({ userId: actor.id, action: 'create', entity: 'DayCloseFlag', entityId: row.id, after: row }, tx);
    }
  }
}

type WindowReturn = Prisma.ReturnGetPayload<{ select: typeof returnSelect }>;
type WindowLedger = Prisma.LedgerEntryGetPayload<{ select: typeof ledgerSelect }>;
type ClosedDay = Prisma.BusinessDayGetPayload<{ select: typeof daySelect }>;

/** Return review row: a human label for the returned line plus the cash/debt split. */
function toReturnRow(r: WindowReturn) {
  const label = r.saleItem.productModel?.name ?? r.saleItem.item?.identifiers[0]?.value ?? 'Device';
  return { id: r.id, item: label, refundAmount: r.refundAmount.toFixed(2), cashRefund: r.cashRefund.toFixed(2), reason: r.reason, user: r.user };
}

/** Expense/income review row. */
function toLedgerRow(l: WindowLedger) {
  return { id: l.id, category: l.category, amount: l.amount.toFixed(2), inCash: l.inCash };
}

/** Closed-day snapshot as decimal strings (frozen values, never recomputed). */
function toDay(d: ClosedDay) {
  return {
    id: d.id,
    openedAt: d.openedAt.toISOString(),
    closedAt: d.closedAt?.toISOString() ?? null,
    status: d.status,
    note: d.note,
    closedBy: d.closedBy,
    expectedCash: d.expectedCash?.toFixed(2) ?? null,
    countedCash: d.countedCash?.toFixed(2) ?? null,
    cashVariance: d.cashVariance?.toFixed(2) ?? null,
    expectedCard: d.expectedCard?.toFixed(2) ?? null,
    countedCard: d.countedCard?.toFixed(2) ?? null,
    cardVariance: d.cardVariance?.toFixed(2) ?? null,
  };
}
