import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemStatus, Prisma, ReturnResult, SaleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { hasPermission } from '../common/permissions';
import { openDayStart } from '../business-day/business-day.mappers';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { closeDebtItems } from './sale-close';
import { saleDetailSelect, toSale } from './sale-shape';
import { balanceOf, cashRefundOf, saleStatusAfterReturn, sumPaid, sumRefunded } from './sale-totals';

type Tx = Prisma.TransactionClient;

const returnSaleSelect = {
  status: true,
  total: true,
  locationId: true,
  payments: { select: { amount: true } },
  returns: { select: { saleItemId: true, quantity: true, refundAmount: true } },
  items: { select: { id: true, itemId: true, productModelId: true, quantity: true, unitPrice: true } },
} satisfies Prisma.SaleSelect;

type ReturnSale = Prisma.SaleGetPayload<{ select: typeof returnSaleSelect }>;
type ReturnLine = ReturnSale['items'][number];

/** Returns of sold lines (PRD FR-23). Corrects both stock and the customer's debt; the sale snapshots stay. */
@Injectable()
export class SaleReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly items: ItemsService,
  ) {}

  /** Records a return, moves the item/stock and recomputes the sale status (see the contract rules). */
  async create(saleId: number, dto: CreateReturnDto, actor: PublicUser) {
    const detail = await this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, select: returnSaleSelect });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status !== SaleStatus.PAID && sale.status !== SaleStatus.DEBT) {
        throw new BadRequestException('Returns are only allowed on paid or debt sales');
      }
      const line = sale.items.find((i) => i.id === dto.saleItemId);
      if (!line) throw new NotFoundException('Sale item not found');

      const quantity = this.resolveQuantity(line, dto, sale.returns);
      const refundAmount = this.resolveRefund(line, dto, sale.returns, quantity);
      // Cash handed back vs debt cancelled, computed server-side (F13): the refund cancels the
      // sale's outstanding balance first; only the excess leaves the drawer. Never trust a client value.
      const balanceBefore = balanceOf(sale.total, sumPaid(sale.payments), sumRefunded(sale.returns));
      const cashRefund = cashRefundOf(refundAmount, balanceBefore);
      await tx.return.create({
        data: { saleId, saleItemId: line.id, quantity, refundAmount, cashRefund, result: dto.result, reason: dto.reason, userId: actor.id },
      });
      await this.applyEffect(tx, line, dto.result, sale.locationId, quantity);
      const status = this.nextStatus(sale, line.id, quantity, refundAmount);
      await tx.sale.update({ where: { id: saleId }, data: { status } });
      // A refund that clears the balance closes the debt: move the still-DEBT items to SOLD.
      if (status === SaleStatus.PAID) await closeDebtItems(tx, this.items, sale.items);
      const after = await tx.sale.findUniqueOrThrow({ where: { id: saleId }, select: saleDetailSelect });
      await this.audit.log(
        { userId: actor.id, action: 'return', entity: 'Sale', entityId: saleId, before: sale, after },
        tx,
      );
      return { after, openedAt: await openDayStart(tx) };
    });
    return toSale(detail.after, hasPermission(actor, 'view_cost'), detail.openedAt);
  }

  /** Device returns are always 1; accessories may return up to what is left (sold − already returned). */
  private resolveQuantity(line: ReturnLine, dto: CreateReturnDto, returns: ReturnSale['returns']): number {
    const alreadyReturned = sumQuantity(returns, line.id);
    if (line.itemId) {
      if (dto.quantity !== undefined && dto.quantity !== 1) {
        throw new BadRequestException('A device line returns a quantity of 1');
      }
      if (alreadyReturned >= 1) throw new BadRequestException('This line is already returned');
      return 1;
    }
    const quantity = dto.quantity ?? 1;
    if (quantity > line.quantity - alreadyReturned) {
      throw new BadRequestException('Return quantity exceeds what was sold');
    }
    return quantity;
  }

  /** Refund is capped at the value of the goods actually returned: unitPrice × returned − refundedSoFar. */
  private resolveRefund(line: ReturnLine, dto: CreateReturnDto, returns: ReturnSale['returns'], quantity: number): Prisma.Decimal {
    const refundAmount = new Prisma.Decimal(dto.refundAmount);
    const lineReturns = returns.filter((r) => r.saleItemId === line.id);
    const alreadyReturned = lineReturns.reduce((sum, r) => sum + r.quantity, 0);
    const refundedSoFar = lineReturns.reduce((sum, r) => sum.plus(r.refundAmount), new Prisma.Decimal(0));
    const cap = line.unitPrice.times(alreadyReturned + quantity).minus(refundedSoFar);
    if (refundAmount.gt(cap)) throw new BadRequestException('refundAmount exceeds the line refund cap');
    return refundAmount;
  }

  /** Device: RETURNED then back to stock (at the sale's location) or DEFECTIVE. Accessory: stock back if BACK_TO_STOCK. */
  private async applyEffect(tx: Tx, line: ReturnLine, result: ReturnResult, saleLocationId: number, quantity: number) {
    if (line.itemId) {
      await this.items.changeStatus(tx, line.itemId, ItemStatus.RETURNED);
      if (result === ReturnResult.BACK_TO_STOCK) {
        await this.items.changeStatus(tx, line.itemId, ItemStatus.IN_STOCK);
        await tx.item.update({ where: { id: line.itemId }, data: { locationId: saleLocationId } });
      } else {
        await this.items.changeStatus(tx, line.itemId, ItemStatus.DEFECTIVE);
      }
      return;
    }
    if (result === ReturnResult.BACK_TO_STOCK && line.productModelId) {
      // The stock row always exists (the sale decremented it), so increment it; never seed avgCost here.
      await tx.accessoryStock.update({
        where: { productModelId_locationId: { productModelId: line.productModelId, locationId: saleLocationId } },
        data: { quantity: { increment: quantity } },
      });
    }
  }

  /** RETURNED when every quantity is back and nothing is owed; else PAID at 0 balance; else DEBT. */
  private nextStatus(sale: ReturnSale, lineId: number, quantity: number, refundAmount: Prisma.Decimal): SaleStatus {
    const returns = [...sale.returns, { saleItemId: lineId, quantity, refundAmount }];
    const allReturned = sale.items.every((i) => sumQuantity(returns, i.id) >= i.quantity);
    const balance = balanceOf(sale.total, sumPaid(sale.payments), sumRefunded(returns));
    return saleStatusAfterReturn(allReturned, balance);
  }
}

/** Total quantity returned so far against one sale line. */
function sumQuantity(returns: { saleItemId: number; quantity: number }[], saleItemId: number): number {
  return returns.filter((r) => r.saleItemId === saleItemId).reduce((sum, r) => sum + r.quantity, 0);
}
