import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { hasPermission } from '../common/permissions';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalePaymentDto } from './dto/create-sale-payment.dto';
import { closeDebtItems } from './sale-close';
import { saleDetailSelect, toSale } from './sale-shape';
import { balanceOf, sumPaid, sumRefunded } from './sale-totals';

/** Payments against a debt sale (PRD FR-21, W3). Collecting the last of the debt closes the sale. */
@Injectable()
export class SalePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly items: ItemsService,
  ) {}

  /** Records a payment; when the balance reaches 0 the sale becomes PAID and its items DEBT → SOLD (BR-9). */
  async create(saleId: number, dto: CreateSalePaymentDto, actor: PublicUser) {
    const detail = await this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        select: {
          status: true,
          total: true,
          payments: { select: { amount: true } },
          returns: { select: { refundAmount: true } },
          items: { select: { itemId: true } },
        },
      });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status !== SaleStatus.DEBT) throw new BadRequestException('Sale is not a debt sale');

      const balance = balanceOf(sale.total, sumPaid(sale.payments), sumRefunded(sale.returns));
      const amount = new Prisma.Decimal(dto.amount);
      if (!amount.isPositive()) throw new BadRequestException('amount must be greater than 0');
      if (amount.gt(balance)) throw new BadRequestException('amount cannot exceed the balance');

      await tx.salePayment.create({
        data: { saleId, amount, method: dto.method, receivedBy: actor.id },
      });
      if (balance.minus(amount).isZero()) {
        await tx.sale.update({ where: { id: saleId }, data: { status: SaleStatus.PAID } });
        await closeDebtItems(tx, this.items, sale.items);
      }
      const after = await tx.sale.findUniqueOrThrow({ where: { id: saleId }, select: saleDetailSelect });
      await this.audit.log(
        { userId: actor.id, action: 'payment', entity: 'Sale', entityId: saleId, before: sale, after },
        tx,
      );
      return after;
    });
    return toSale(detail, hasPermission(actor, 'view_cost'));
  }
}
