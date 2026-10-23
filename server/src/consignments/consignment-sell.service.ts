import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsignmentItemStatus, ItemStatus, PaymentMethod, Prisma, SaleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildLine } from '../sales/sale-create';
import { consignmentDetailSelect, toConsignment } from './consignment-shape';
import { SellConsignmentItemDto } from './dto/sell-consignment-item.dto';

type Tx = Prisma.TransactionClient;

/**
 * Records a partner's sale of a held item (W4 step 3). The sale price is always the item's
 * current minPrice (BR-7, BR-8); change it first with PATCH to sell at another amount.
 */
@Injectable()
export class ConsignmentSellService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly items: ItemsService,
  ) {}

  /** Creates the Sale (at minPrice), optional full payment, and moves the item, all in one transaction. */
  async sell(consignmentId: number, itemId: number, dto: SellConsignmentItemDto, actorId: number) {
    const detail = await this.prisma.$transaction(async (tx) => {
      const ci = await tx.consignmentItem.findFirst({
        where: { id: itemId, consignmentId },
        select: {
          status: true,
          minPrice: true,
          consignment: { select: { partnerId: true } },
          item: { select: { id: true, locationId: true } },
        },
      });
      if (!ci) throw new NotFoundException('Consignment item not found');
      if (ci.status !== ConsignmentItemStatus.AT_PARTNER) {
        throw new BadRequestException('Only a held item (AT_PARTNER) can be sold');
      }
      const { saleId, saleItemId } = await this.createPartnerSale(tx, ci, dto, actorId);
      await this.items.changeStatus(tx, ci.item.id, dto.paid ? ItemStatus.SOLD : ItemStatus.DEBT);
      await tx.consignmentItem.update({
        where: { id: itemId },
        data: { status: ConsignmentItemStatus.SOLD, soldAt: new Date(), saleItemId },
      });
      await this.audit.log(
        { userId: actorId, action: 'sell', entity: 'ConsignmentItem', entityId: itemId, after: { saleId } },
        tx,
      );
      return tx.consignment.findUniqueOrThrow({ where: { id: consignmentId }, select: consignmentDetailSelect });
    });
    return toConsignment(detail);
  }

  /** Creates (and audits) the Sale, its one device line (unitPrice = minPrice) and payment when paid. */
  private async createPartnerSale(
    tx: Tx,
    ci: { minPrice: Prisma.Decimal; consignment: { partnerId: number }; item: { id: number; locationId: number } },
    dto: SellConsignmentItemDto,
    actorId: number,
  ): Promise<{ saleId: number; saleItemId: number }> {
    const line = { itemId: ci.item.id, unitPrice: ci.minPrice.toFixed(2) };
    // allow AT_PARTNER and skip the price floor here: the floor is enforced where minPrice is set (FR-20).
    const built = await buildLine(tx, line, ci.item.locationId, true, ItemStatus.AT_PARTNER);
    const status = dto.paid ? SaleStatus.PAID : SaleStatus.DEBT;
    const sale = await tx.sale.create({
      data: {
        partnerId: ci.consignment.partnerId,
        customerId: null,
        locationId: ci.item.locationId,
        sellerId: actorId,
        status,
        total: built.lineTotal,
      },
    });
    await this.audit.log({ userId: actorId, action: 'create', entity: 'Sale', entityId: sale.id, after: sale }, tx);
    const saleItem = await tx.saleItem.create({ data: { ...built.data, saleId: sale.id }, select: { id: true } });
    if (dto.paid) {
      await tx.salePayment.create({
        data: { saleId: sale.id, amount: built.lineTotal, method: dto.method ?? PaymentMethod.CASH, receivedBy: actorId },
      });
    }
    return { saleId: sale.id, saleItemId: saleItem.id };
  }
}
