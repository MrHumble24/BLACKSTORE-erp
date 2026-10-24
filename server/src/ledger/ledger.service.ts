import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerType, Prisma } from '@prisma/client';
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
  user: { select: { id: true, name: true } },
} satisfies Prisma.LedgerEntrySelect;

type EntryRow = Prisma.LedgerEntryGetPayload<{ select: typeof entrySelect }>;
type TypeGroup = { type: LedgerType; _sum?: { amount?: Prisma.Decimal | null } };

/** Manual income/expense ledger (FR-27); sales income comes from F05, not here. */
@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Paginated, newest-first list plus income/expense/net totals over the whole filter. */
  async findAll(query: QueryLedgerDto) {
    const where: Prisma.LedgerEntryWhereInput = {
      type: query.type,
      category: query.category,
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
      this.prisma.ledgerEntry.groupBy({ by: ['type'], where, _sum: { amount: true }, orderBy: { type: 'asc' } }),
    ]);
    const income = sumFor(groups, LedgerType.INCOME);
    const expense = sumFor(groups, LedgerType.EXPENSE);
    return {
      items: rows.map(toEntry),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totals: {
        income: income.toFixed(2),
        expense: expense.toFixed(2),
        net: income.minus(expense).toFixed(2),
      },
    };
  }

  /** Creates an entry; countsInProfit is forced false unless the type is INCOME (BR-5). */
  async create(dto: CreateLedgerEntryDto, actor: PublicUser) {
    const amount = new Prisma.Decimal(dto.amount);
    if (!amount.gt(0)) throw new BadRequestException('amount must be greater than zero');
    const countsInProfit = dto.type === LedgerType.INCOME ? (dto.countsInProfit ?? false) : false;
    const created = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.create({
        data: {
          type: dto.type,
          category: dto.category,
          amount,
          date: parsePastDate(dto.date) ?? new Date(),
          note: dto.note,
          countsInProfit,
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

/** Total amount for one type from the groupBy result, or zero when absent. */
function sumFor(groups: TypeGroup[], type: LedgerType): Prisma.Decimal {
  const { _sum } = groups.find((g) => g.type === type) ?? {};
  return _sum?.amount ?? new Prisma.Decimal(0);
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
    user: row.user,
  };
}
