import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseStatus, LedgerType, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { dateRange, parsePastDate } from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { QueryLedgerDto } from './dto/query-ledger.dto';

const entrySelect = {
  id: true,
  type: true,
  category: true,
  amount: true,
  date: true,
  note: true,
  countsInProfit: true,
  inCash: true,
  status: true,
  user: { select: { id: true, name: true } },
} satisfies Prisma.LedgerEntrySelect;

type EntryRow = Prisma.LedgerEntryGetPayload<{ select: typeof entrySelect }>;
type TotalsGroup = { type: LedgerType; status: ExpenseStatus; _sum?: { amount?: Prisma.Decimal | null } };

/** Manual income/expense ledger (FR-27); sales income comes from F05, not here. */
@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Paginated, newest-first list plus totals over the whole filter. `expense` and `net` count
   * CONFIRMED expenses only (F27); PENDING and EXCLUDED get their own totals.
   */
  async findAll(query: QueryLedgerDto) {
    const where: Prisma.LedgerEntryWhereInput = {
      type: query.type,
      category: query.category,
      status: query.status,
      date: dateRange(query.from, query.to),
    };
    const [rows, total, groups] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        select: entrySelect,
        orderBy: [{ date: 'desc' }, { id: 'desc' }], // entries can be backdated, so date leads
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.ledgerEntry.count({ where }),
      this.prisma.ledgerEntry.groupBy({
        by: ['type', 'status'],
        where,
        _sum: { amount: true },
        orderBy: [{ type: 'asc' }, { status: 'asc' }],
      }),
    ]);
    return {
      items: rows.map(toEntry),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totals: toTotals(groups),
    };
  }

  /**
   * Creates an entry; countsInProfit is forced false unless the type is INCOME (BR-5).
   * An EXPENSE starts PENDING until the Admin decides (F27); INCOME is always CONFIRMED.
   */
  async create(dto: CreateLedgerEntryDto, actor: PublicUser) {
    const amount = new Prisma.Decimal(dto.amount);
    if (!amount.gt(0)) throw new BadRequestException('amount must be greater than zero');
    const isIncome = dto.type === LedgerType.INCOME;
    const countsInProfit = isIncome ? (dto.countsInProfit ?? false) : false;
    const created = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.create({
        data: {
          type: dto.type,
          category: dto.category,
          amount,
          date: parsePastDate(dto.date) ?? new Date(),
          note: dto.note,
          countsInProfit,
          status: isIncome ? ExpenseStatus.CONFIRMED : ExpenseStatus.PENDING,
          inCash: dto.inCash ?? true,
          userId: actor.id,
        },
        select: entrySelect,
      });
      await this.audit.log(
        { userId: actor.id, action: 'create', entity: 'LedgerEntry', entityId: entry.id, after: entry },
        tx,
      );
      return entry;
    });
    return toEntry(created);
  }

  /** Admin confirms or excludes an EXPENSE (F27), any direction; audited with before/after. */
  async setStatus(id: number, status: ExpenseStatus, actor: PublicUser) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.ledgerEntry.findUnique({ where: { id }, select: entrySelect });
      if (!before) throw new NotFoundException('Ledger entry not found');
      if (before.type === LedgerType.INCOME) throw new BadRequestException('Only an EXPENSE has a status');
      // Already at the requested status: nothing changes, so no update and no audit row.
      if (before.status === status) return before;
      const after = await tx.ledgerEntry.update({ where: { id }, data: { status }, select: entrySelect });
      await this.audit.log(
        { userId: actor.id, action: 'update', entity: 'LedgerEntry', entityId: id, before, after },
        tx,
      );
      return after;
    });
    return toEntry(updated);
  }

  /** Distinct ledger categories, sorted, for pick-lists. */
  async categories(): Promise<string[]> {
    const rows = await this.prisma.ledgerEntry.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }
}

/** Ledger totals from the (type, status) groupBy; INCOME status is ignored, net uses CONFIRMED expenses. */
function toTotals(groups: TotalsGroup[]) {
  const sum = (keep: (g: TotalsGroup) => boolean) =>
    groups.filter(keep).reduce((s, { _sum }) => s.plus(_sum?.amount ?? 0), new Prisma.Decimal(0));
  const expenseOf = (status: ExpenseStatus) => sum((g) => g.type === LedgerType.EXPENSE && g.status === status);
  const income = sum((g) => g.type === LedgerType.INCOME);
  const expense = expenseOf(ExpenseStatus.CONFIRMED);
  return {
    income: income.toFixed(2),
    expense: expense.toFixed(2),
    pendingExpense: expenseOf(ExpenseStatus.PENDING).toFixed(2),
    excludedExpense: expenseOf(ExpenseStatus.EXCLUDED).toFixed(2),
    net: income.minus(expense).toFixed(2),
  };
}

/** Maps a row to the LedgerEntry API shape (amount as a decimal string). */
function toEntry(row: EntryRow) {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    amount: row.amount.toFixed(2),
    date: row.date,
    note: row.note,
    countsInProfit: row.countsInProfit,
    inCash: row.inCash,
    status: row.status,
    user: row.user,
  };
}
