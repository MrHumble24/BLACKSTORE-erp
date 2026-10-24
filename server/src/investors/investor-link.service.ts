import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SuppliersService } from '../suppliers/suppliers.service';

/**
 * Links an investor to the supplier record of the same person (F26), so goods received, money sent
 * and profit share add up to one account. Runs inside the caller's transaction; the caller writes
 * `supplierId` and the audit row, so one Investor audit row carries the change.
 */
@Injectable()
export class InvestorLinkService {
  constructor(private readonly suppliers: SuppliersService) {}

  /**
   * Checks that `supplierId` may be linked to the investor (null = unlink, always allowed). A supplier
   * with history is fine: its past batches and payments are this person's. OWN is never linked.
   */
  async assertLinkable(
    tx: Prisma.TransactionClient,
    investor: { id: number; isOwn: boolean | null },
    supplierId: number | null,
  ): Promise<void> {
    if (supplierId === null) return;
    if (investor.isOwn === true) throw new BadRequestException('The business investor cannot be linked to a supplier');
    const supplier = await tx.supplier.findUnique({
      where: { id: supplierId },
      select: { isActive: true, investor: { select: { id: true } } },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!supplier.isActive) throw new BadRequestException('Inactive supplier');
    if (supplier.investor && supplier.investor.id !== investor.id) {
      throw new ConflictException('Supplier already linked to another investor');
    }
  }

  /**
   * Supplier id for a new investor who "sends us devices": an unlinked supplier with exactly that name
   * is reused, otherwise one is created (audited by SuppliersService). The name is looked up first
   * because a P2002 inside a Postgres transaction aborts it, so it can't be caught and retried.
   */
  async supplierForNewInvestor(tx: Prisma.TransactionClient, name: string, actorId: number): Promise<number> {
    const existing = await tx.supplier.findUnique({
      where: { name },
      select: { id: true, isActive: true, investor: { select: { id: true } } },
    });
    if (!existing) return (await this.suppliers.createInTx(tx, { name }, actorId)).id;
    if (existing.investor) throw new ConflictException('A supplier with this name belongs to another investor');
    if (!existing.isActive) {
      throw new BadRequestException('A supplier with this name is inactive; reactivate it or turn off "Sends us devices"');
    }
    return existing.id;
  }
}
