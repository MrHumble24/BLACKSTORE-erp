import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { DayStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { errorMessage, safeSend } from '../common/telegram';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildDayCloseAlertText } from './business-day-messages';
import { loadEvents, buildEvents } from './business-day.events';
import {
  ClosedDay, confirmedSaleSelect, daySelect, DayWindow, DbClient, DrawerWindow, ledgerSelect, lockOpenDay, openDay, saleSelect,
  toDay, toLedgerRow, toReturnRow, Tx, walkInSelect, windowRange,
} from './business-day.mappers';
import { computeExpected } from './business-day.reconcile';
import { loadPendingSales, loadSaleMoney, splitSaleMoney, toPendingSaleRow, toSaleRow } from './business-day.sale-gate';
import { CloseDayDto, FlagInputDto } from './dto/close-day.dto';
import { UpdateBusinessDayDto } from './dto/update-business-day.dto';

/** Daily close / reconciliation (F13). Owner-only (close_day); anti-fraud drawer counting with flags. */
@Injectable()
export class BusinessDayService {
  private readonly logger = new Logger(BusinessDayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly telegram?: TelegramConfigService,
  ) {}

  /** The current OPEN day with live expected cash/card, its breakdown, the review lists and the events feed (F13, F30). */
  async getCurrent() {
    const day = await this.openDayOrThrow(this.prisma);
    const [win, extra, pending] = await Promise.all([
      this.loadDayWindow(day.openedAt), loadEvents(this.prisma, day.openedAt), loadPendingSales(this.prisma),
    ]);
    const e = computeExpected(win);
    return {
      day: { id: day.id, openedAt: day.openedAt.toISOString() },
      expectedCash: e.expectedCash.toFixed(2),
      expectedCard: e.expectedCard.toFixed(2),
      payments: { cash: e.paymentsCash.toFixed(2), card: e.paymentsCard.toFixed(2) },
      breakdown: {
        paymentsCash: e.paymentsCash.toFixed(2),
        paymentsCard: e.paymentsCard.toFixed(2),
        cashIncome: e.cashIncome.toFixed(2),
        cashExpense: e.cashExpense.toFixed(2),
        cashRefunds: e.cashRefunds.toFixed(2),
        walkInPurchases: e.walkInPurchases.toFixed(2),
        pendingWalkInPurchases: e.pendingWalkInPurchases.toFixed(2),
        pendingSalesCash: pending.cash.toFixed(2),
        pendingSalesCard: pending.card.toFixed(2),
      },
      sales: win.sales.map(toSaleRow),
      pendingSales: pending.rows.map(toPendingSaleRow),
      pendingSalesCount: pending.count,
      returns: win.windowReturns.map(toReturnRow),
      expenses: win.ledger.filter((l) => l.type === 'EXPENSE').map(toLedgerRow),
      income: win.ledger.filter((l) => l.type === 'INCOME').map(toLedgerRow),
      events: buildEvents(win, extra),
    };
  }

  /**
   * Closes the current day in ONE transaction: freezes the expected/counted/variance snapshot,
   * records flags, auto-opens the next day, and audits the close, the auto-open and every flag.
   * The OPEN-row lock (first statement, no retry) serializes the close with walk-in pay/unpay (F32)
   * and with a second close: the loser waits, then finds no OPEN row and gets a 409.
   */
  async close(dto: CloseDayDto, actor: PublicUser) {
    const closedDay = await this.prisma.$transaction(async (tx) => {
      const day = await lockOpenDay(tx, { retry: false });
      const closedAt = new Date();
      const expected = computeExpected(await this.loadDrawer(tx, day.openedAt, closedAt));

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

      // Belt and braces behind the lock: never overwrite a day that is no longer OPEN.
      const { count } = await tx.businessDay.updateMany({ where: { id: day.id, status: DayStatus.OPEN }, data: snapshot });
      if (count !== 1) throw new ConflictException('The day is already closed');

      await this.createFlags(tx, day.id, dto.flags, actor);
      const nextDay = await tx.businessDay.create({ data: { openedAt: closedAt }, select: { id: true, openedAt: true, status: true } });
      const closed = await tx.businessDay.findUniqueOrThrow({ where: { id: day.id }, select: daySelect });

      await this.audit.log({ userId: actor.id, action: 'close', entity: 'BusinessDay', entityId: day.id, before: { id: day.id, status: DayStatus.OPEN }, after: closed }, tx);
      await this.audit.log({ userId: actor.id, action: 'create', entity: 'BusinessDay', entityId: nextDay.id, after: nextDay }, tx);
      return closed;
    });

    await this.notifyDayClose(closedDay, actor.name, dto.note);
    return toDay(closedDay);
  }

  /** Sends an instant Telegram alert to the owner on day close (F34, Phase 1). */
  private async notifyDayClose(closed: ClosedDay, actorName: string, note?: string | null): Promise<void> {
    try {
      if (!this.telegram) return;
      if (!(await this.telegram.isFeatureEnabled('dayCloseAlerts'))) return;
      const { token, alertChatId } = await this.telegram.getCredentials();
      if (!token || !alertChatId) return;
      const text = buildDayCloseAlertText(closed, actorName, note);
      await safeSend(this.logger, token, alertChatId, text, 'Day close alert');
    } catch (e) {
      this.logger.warn(`Day close Telegram alert failed: ${errorMessage(e)}`);
    }
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
    const day = await openDay(client);
    if (!day) throw new ConflictException('No open business day');
    return day;
  }

  /**
   * Drawer rows of the half-open window [openedAt, closedAt): ledger keyed on the immutable createdAt,
   * walk-in payouts on the server-set paidAt (F32), sale payments and cash refunds on
   * max(createdAt, sale.confirmedAt) (F33). Also returns the sale money recorded in the window for the feed.
   */
  private async loadDrawer(client: DbClient, openedAt: Date, closedAt?: Date) {
    const range = windowRange(openedAt, closedAt);
    const [money, ledger, walkInPayouts] = await Promise.all([
      loadSaleMoney(client, openedAt, closedAt),
      client.ledgerEntry.findMany({ where: { createdAt: range }, select: ledgerSelect }),
      client.purchaseLine.findMany({ where: { paidAt: range, walkInSellerId: { not: null } }, select: walkInSelect }),
    ]);
    return { ...splitSaleMoney(money, openedAt, closedAt), ledger, walkInPayouts } satisfies DrawerWindow;
  }

  /**
   * The open day's drawer rows plus the informational lists: sales, sales confirmed today (F33),
   * walk-ins bought today, every unpaid walk-in line.
   */
  private async loadDayWindow(openedAt: Date): Promise<DayWindow> {
    const range = windowRange(openedAt);
    const walkIn = { walkInSellerId: { not: null } };
    const [drawer, sales, confirmedSales, walkInPurchases, pendingWalkIn] = await Promise.all([
      this.loadDrawer(this.prisma, openedAt),
      this.prisma.sale.findMany({ where: { createdAt: range }, select: saleSelect, orderBy: { id: 'desc' } }),
      this.prisma.sale.findMany({ where: { confirmedAt: range }, select: confirmedSaleSelect }),
      this.prisma.purchaseLine.findMany({ where: { createdAt: range, ...walkIn }, select: walkInSelect }),
      this.prisma.purchaseLine.findMany({ where: { paidAt: null, ...walkIn }, select: { unitPrice: true, quantity: true } }),
    ]);
    return { ...drawer, sales, confirmedSales, walkInPurchases, pendingWalkIn };
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
