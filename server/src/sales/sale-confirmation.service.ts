import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditEntry, AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { lockOpenDay, Tx } from '../business-day/business-day.mappers';
import { canUndoConfirmation } from '../business-day/business-day.sale-gate';
import { PrismaService } from '../prisma/prisma.service';
import { saleSummarySelect, toSaleSummary } from './sale-shape';

type Confirmation = { confirmedAt: Date | null; confirmedById: number | null };
const confirmationSelect = { id: true, confirmedAt: true, confirmedById: true } satisfies Prisma.SaleSelect;

/**
 * Sale confirmation at the daily close (F33): a sale's money counts in the drawer only once the Admin
 * confirms it, from the moment of confirmation. A drawer gate only; status, debt and profit never change.
 * Every action locks the OPEN day row first so it serializes with the close (as walk-in payouts, F32).
 */
@Injectable()
export class SaleConfirmationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Confirms one sale now, by the actor; 404 unknown, 409 already confirmed. */
  async confirm(id: number, actor: PublicUser) {
    return this.change(id, actor, (sale) => {
      if (sale.confirmedAt) throw new ConflictException('Sale already confirmed');
      return { confirmedAt: new Date(), confirmedById: actor.id };
    });
  }

  /** Undoes a confirmation still inside the OPEN day; 409 when not confirmed or already frozen by a close. */
  async unconfirm(id: number, actor: PublicUser) {
    return this.change(id, actor, (sale, openedAt) => {
      if (!sale.confirmedAt) throw new ConflictException('Sale is not confirmed');
      if (!canUndoConfirmation(sale.confirmedAt, openedAt)) throw new ConflictException('Sale belongs to a closed day and cannot be undone');
      return { confirmedAt: null, confirmedById: null };
    });
  }

  /** Confirms many sales at once; already-confirmed ids are skipped, any unknown id fails the batch (404). */
  async confirmMany(ids: number[], actor: PublicUser) {
    const unique = [...new Set(ids)];
    return this.prisma.$transaction(async (tx) => {
      await lockOpenDay(tx);
      const rows = await tx.sale.findMany({ where: { id: { in: unique } }, select: confirmationSelect });
      if (rows.length !== unique.length) throw new NotFoundException('Sale not found');
      const pending = rows.filter((r) => r.confirmedAt === null).map((r) => r.id);
      const after = { confirmedAt: new Date(), confirmedById: actor.id };
      const { count } = await tx.sale.updateMany({ where: { id: { in: pending }, confirmedAt: null }, data: after });
      // One audit row per sale (FR-30), written as one INSERT while the day lock is held.
      const before = { confirmedAt: null, confirmedById: null };
      await this.audit.logMany(pending.map((id) => this.auditEntry(actor, id, before, after)), tx);
      return { confirmed: count };
    });
  }

  /** Shared confirm/unconfirm transaction: lock the day, load + check the sale, update, audit, reload the summary. */
  private async change(id: number, actor: PublicUser, decide: (sale: Confirmation, openedAt: Date) => Confirmation) {
    return this.prisma.$transaction(async (tx) => {
      const day = await lockOpenDay(tx);
      const before = await tx.sale.findUnique({ where: { id }, select: confirmationSelect });
      if (!before) throw new NotFoundException('Sale not found');
      const data = decide(before, day.openedAt);
      const row = await tx.sale.update({ where: { id }, data, select: saleSummarySelect });
      await this.logChange(tx, actor, id, { confirmedAt: before.confirmedAt, confirmedById: before.confirmedById }, data);
      return toSaleSummary(row, day.openedAt);
    });
  }

  /** One AuditLog row with only the confirmation fields before/after. */
  private async logChange(tx: Tx, actor: PublicUser, id: number, before: Confirmation, after: Confirmation) {
    await this.audit.log(this.auditEntry(actor, id, before, after), tx);
  }

  /** The audit entry of one confirmation change. */
  private auditEntry(actor: PublicUser, id: number, before: Confirmation, after: Confirmation): AuditEntry {
    return { userId: actor.id, action: 'update', entity: 'Sale', entityId: id, before, after };
  }
}
