import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { hasPermission } from '../common/permissions';
import { runSequential } from '../common/sequential';
import { CreateItemDto } from '../items/dto/create-item.dto';
import { assertActive, editItemSelect } from '../items/item-queries';
import { itemSelect, toItem } from '../items/item-shape';
import { assertIdentifierCaps, validateAttributes, validateIdentifier } from '../items/item-validation';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalkInPurchaseDto, WalkInSellerDto } from './dto/create-walk-in-purchase.dto';

type Tx = Prisma.TransactionClient;
type NormalizedId = { type: CreateItemDto['identifiers'][number]['type']; value: string };

/** Walk-in purchases from the public (FR-25, W5), including buy-back of our own SOLD device. */
@Injectable()
export class WalkInPurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly items: ItemsService,
  ) {}

  /** New device, or a buy-back when a known identifier points to a SOLD item; else 409. */
  async create(dto: CreateWalkInPurchaseDto, actor: PublicUser) {
    const identifiers: NormalizedId[] = dto.identifiers.map((i) => ({
      type: i.type,
      value: validateIdentifier(i.type, i.value),
    }));
    // ponytail: not locked; two simultaneous buy-backs of the same IMEI could add two purchase lines. Use SELECT ... FOR UPDATE if it ever matters.
    const existing = await this.prisma.itemIdentifier.findFirst({
      where: { value: { in: identifiers.map((i) => i.value) } },
      select: { type: true, value: true, itemId: true, item: { select: { status: true } } },
    });
    if (existing) {
      if (existing.item.status === ItemStatus.SOLD) {
        return this.buyBack(dto, existing.itemId, identifiers, actor);
      }
      throw new ConflictException(
        `${existing.type} ${existing.value} already belongs to item #${existing.itemId} (${existing.item.status})`,
      );
    }
    return this.newPurchase(dto, actor);
  }

  /** Creates a fresh item with a walk-in PurchaseLine, in one transaction with the seller. */
  private async newPurchase(dto: CreateWalkInPurchaseDto, actor: PublicUser) {
    return this.prisma.$transaction(async (tx) => {
      const walkInSellerId = await this.upsertSeller(tx, dto.seller);
      const itemDto: CreateItemDto = {
        productModelId: dto.productModelId,
        investorId: dto.investorId ?? (await this.ownInvestorId(tx)),
        locationId: dto.locationId,
        condition: dto.condition,
        attributes: dto.attributes,
        identifiers: dto.identifiers,
        purchasePrice: dto.pricePaid,
      };
      return this.items.receiveDevice(tx, itemDto, actor, {
        source: { walkInSellerId },
        allowPriceWithoutPermission: true,
      });
    });
  }

  /**
   * Buy-back (BR-9): reuse the SOLD item record — status → IN_STOCK, reset owner/location/
   * condition/attributes/purchasePrice, clear sale prices, add a new walk-in PurchaseLine
   * (old lines kept). The old sale is untouched (BR-7).
   */
  private async buyBack(
    dto: CreateWalkInPurchaseDto,
    itemId: number,
    identifiers: NormalizedId[],
    actor: PublicUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.item.findUniqueOrThrow({ where: { id: itemId }, select: editItemSelect });
      if (before.productModelId !== dto.productModelId) {
        throw new BadRequestException('Buy-back product model must match the sold item');
      }
      const walkInSellerId = await this.upsertSeller(tx, dto.seller);
      const investorId = dto.investorId ?? (await this.ownInvestorId(tx));
      await assertActive(tx, investorId, dto.locationId);
      const attributes = validateAttributes(dto.attributes, before.productModel.category.attributes);
      const pricePaid = new Prisma.Decimal(dto.pricePaid);
      await this.items.changeStatus(tx, itemId, ItemStatus.IN_STOCK);
      const row = await tx.item.update({
        where: { id: itemId },
        data: {
          investorId,
          locationId: dto.locationId,
          condition: dto.condition,
          attributes,
          purchasePrice: pricePaid,
          extraCost: new Prisma.Decimal(0),
          salePrice: null,
          minSalePrice: null,
        },
        select: itemSelect,
      });
      await tx.purchaseLine.create({ data: { itemId, walkInSellerId, quantity: 1, unitPrice: pricePaid } });
      await this.addMissingIdentifiers(tx, itemId, identifiers, before.identifiers);
      await this.audit.log(
        { userId: actor.id, action: 'update', entity: 'Item', entityId: itemId, before, after: row },
        tx,
      );
      return toItem(row, hasPermission(actor, 'view_cost'));
    });
  }

  /** Reuse a seller matched by trimmed phone (updating its name), otherwise create one. */
  private async upsertSeller(tx: Tx, seller: WalkInSellerDto): Promise<number> {
    const phone = seller.phone.trim();
    const existing = await tx.walkInSeller.findFirst({ where: { phone }, select: { id: true } });
    if (existing) {
      await tx.walkInSeller.update({ where: { id: existing.id }, data: { name: seller.name } });
      return existing.id;
    }
    const created = await tx.walkInSeller.create({ data: { name: seller.name, phone } });
    return created.id;
  }

  /** The business's own investor, the default owner of a walk-in device. */
  private async ownInvestorId(tx: Tx): Promise<number> {
    const own = await tx.investor.findFirstOrThrow({ where: { isOwn: true }, select: { id: true } });
    return own.id;
  }

  /** Adds any requested identifier the item does not already carry (missing-only). */
  private async addMissingIdentifiers(
    tx: Tx,
    itemId: number,
    wanted: NormalizedId[],
    current: { type: NormalizedId['type']; value: string }[],
  ) {
    const have = new Set(current.map((i) => i.value));
    const missing = wanted.filter((id) => !have.has(id.value));
    assertIdentifierCaps(missing.map((i) => i.type), current.map((i) => i.type));
    await runSequential(
      missing.map((id) => tx.itemIdentifier.create({ data: { itemId, type: id.type, value: id.value } })),
    );
  }
}
