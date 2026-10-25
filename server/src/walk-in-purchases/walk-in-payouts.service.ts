import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { itemNameSelect, lockOpenDay, Tx } from '../business-day/business-day.mappers';
import { lineTotal } from '../common/money';
import { PrismaService } from '../prisma/prisma.service';

/** Everything a payout row needs; cost is the line itself, so this is close_day-only data. */
const payoutSelect = {
  id: true,
  createdAt: true,
  unitPrice: true,
  quantity: true,
  walkInSellerId: true,
  paidAt: true,
  paidBy: { select: { id: true, name: true } },
  walkInSeller: { select: { name: true, phone: true } },
  item: { select: { id: true, ...itemNameSelect.select } },
} satisfies Prisma.PurchaseLineSelect;

type PayoutLine = Prisma.PurchaseLineGetPayload<{ select: typeof payoutSelect }>;

/** API shape of one walk-in payout (F32 contract `WalkInPayoutRow`). */
function toPayoutRow(l: PayoutLine) {
  return {
    lineId: l.id,
    createdAt: l.createdAt.toISOString(),
    amount: lineTotal(l).toFixed(2),
    seller: { name: l.walkInSeller?.name ?? '', phone: l.walkInSeller?.phone ?? '' },
    item: l.item
      ? { id: l.item.id, model: l.item.productModel.name, identifier: l.item.identifiers[0]?.value ?? null }
      : null,
    paidAt: l.paidAt?.toISOString() ?? null,
    paidBy: l.paidBy,
  };
}

/**
 * Walk-in payout confirmation (F32, W5/F13): a walk-in purchase leaves the drawer only when the
 * Admin confirms the seller was paid, on the day of confirmation. Both actions lock the OPEN day
 * row first so they serialize with the daily close.
 */
@Injectable()
export class WalkInPayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Unconfirmed walk-in lines of any day, oldest first, paginated. */
  async findPending(query: PaginationQueryDto) {
    const where = { walkInSellerId: { not: null }, paidAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.purchaseLine.findMany({
        where,
        select: payoutSelect,
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.purchaseLine.count({ where }),
    ]);
    return { items: rows.map(toPayoutRow), total, page: query.page, pageSize: query.pageSize };
  }

  /** Confirms the payout now, by the actor; 409 when already confirmed. */
  async pay(lineId: number, actor: PublicUser) {
    return this.change(lineId, actor, (line) => {
      if (line.paidAt) throw new ConflictException('Payout already confirmed');
      return { paidAt: new Date(), paidById: actor.id };
    });
  }

  /** Undoes a payout still inside the OPEN day; 409 when not confirmed or already frozen by a close. */
  async unpay(lineId: number, actor: PublicUser) {
    return this.change(lineId, actor, (line, openedAt) => {
      if (!line.paidAt) throw new ConflictException('Payout is not confirmed');
      if (line.paidAt < openedAt) throw new ConflictException('Payout belongs to a closed day and cannot be undone');
      return { paidAt: null, paidById: null };
    });
  }

  /** Shared pay/unpay transaction: lock the day, load + check the line, update, audit before/after. */
  private async change(
    lineId: number,
    actor: PublicUser,
    decide: (line: PayoutLine, openedAt: Date) => Prisma.PurchaseLineUncheckedUpdateInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const day = await lockOpenDay(tx);
      const before = await this.walkInLineOrThrow(tx, lineId);
      const after = await tx.purchaseLine.update({
        where: { id: lineId },
        data: decide(before, day.openedAt),
        select: payoutSelect,
      });
      // Only the payout fields changed; keep the seller's phone out of the audit log.
      const payout = (l: PayoutLine) => ({ paidAt: l.paidAt, paidById: l.paidBy?.id ?? null });
      await this.audit.log(
        { userId: actor.id, action: 'update', entity: 'PurchaseLine', entityId: lineId, before: payout(before), after: payout(after) },
        tx,
      );
      return toPayoutRow(after);
    });
  }

  /** The walk-in line, or 404 when it is missing or not a walk-in purchase. */
  private async walkInLineOrThrow(tx: Tx, lineId: number): Promise<PayoutLine> {
    const line = await tx.purchaseLine.findUnique({ where: { id: lineId }, select: payoutSelect });
    if (!line || line.walkInSellerId === null) throw new NotFoundException('Walk-in purchase line not found');
    return line;
  }
}
