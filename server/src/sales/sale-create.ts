import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ItemStatus, Prisma, ShareType } from '@prisma/client';
import { assertAccessoryModel, sellDeviceSelect } from '../items/item-queries';
import { CreateSaleLineDto } from './dto/create-sale.dto';

type Tx = Prisma.TransactionClient;

/** A validated sale line: the row to insert, its total, and the stock move it triggers. */
export interface BuiltLine {
  data: Omit<Prisma.SaleItemCreateManyInput, 'saleId'>;
  lineTotal: Prisma.Decimal;
  moveItemId: number | null; // device item to move through changeStatus
  decrement: { productModelId: number; locationId: number; quantity: number } | null; // accessory stock to lower
}

/**
 * Validates one line and builds its row; exactly one of itemId / productModelId is required.
 * `allowedStatus` is the device status the item must be in (IN_STOCK for a normal sale,
 * AT_PARTNER for a consignment sale); accessory lines ignore it.
 */
export async function buildLine(
  tx: Tx,
  line: CreateSaleLineDto,
  locationId: number,
  canManagePrices: boolean,
  allowedStatus: ItemStatus = ItemStatus.IN_STOCK,
): Promise<BuiltLine> {
  const hasItem = line.itemId != null;
  const hasModel = line.productModelId != null;
  if (hasItem === hasModel) {
    throw new BadRequestException('A sale line needs exactly one of itemId or productModelId');
  }
  return hasItem
    ? buildDeviceLine(tx, line, locationId, canManagePrices, allowedStatus)
    : buildAccessoryLine(tx, line, locationId);
}

/** Device line (W2): item must be in `allowedStatus` at the location; price floor enforced unless manage_prices. */
async function buildDeviceLine(
  tx: Tx,
  line: CreateSaleLineDto,
  locationId: number,
  canManagePrices: boolean,
  allowedStatus: ItemStatus,
): Promise<BuiltLine> {
  if (line.quantity !== undefined) throw new BadRequestException('A device line cannot set quantity');
  const itemId = line.itemId as number; // guaranteed by buildLine's xor check
  const item = await tx.item.findUnique({ where: { id: itemId }, select: sellDeviceSelect });
  if (!item) throw new NotFoundException('Item not found');
  if (item.status !== allowedStatus) throw new BadRequestException(`Item is not ${allowedStatus}`);
  if (item.locationId !== locationId) throw new BadRequestException('Item is not at this location');
  const unitPrice = new Prisma.Decimal(line.unitPrice);
  // minSalePrice null = no floor; below a set floor is refused for users without manage_prices (FR-20).
  if (item.minSalePrice && unitPrice.lt(item.minSalePrice) && !canManagePrices) {
    throw new BadRequestException('Below minimum price');
  }
  return {
    data: {
      itemId: item.id,
      productModelId: item.productModelId, // device line carries the model from its item
      quantity: 1,
      unitPrice,
      unitCost: item.purchasePrice.plus(item.extraCost), // BR-7 snapshot
      investorId: item.investorId,
      shareType: item.investor.shareType,
      shareValue: item.investor.shareValue,
      warrantyUntil: line.warrantyUntil ? new Date(line.warrantyUntil) : null,
    },
    lineTotal: unitPrice,
    moveItemId: item.id,
    decrement: null,
  };
}

/** Accessory line (FR-4): needs enough stock at the location; snapshots avgCost, no investor share. */
async function buildAccessoryLine(
  tx: Tx,
  line: CreateSaleLineDto,
  locationId: number,
): Promise<BuiltLine> {
  const quantity = line.quantity;
  if (quantity === undefined) throw new BadRequestException('An accessory line needs a quantity');
  if (line.warrantyUntil !== undefined) {
    throw new BadRequestException('An accessory line cannot set a warranty');
  }
  const productModelId = line.productModelId as number; // guaranteed by buildLine's xor check
  await assertAccessoryModel(tx, productModelId);
  const stock = await tx.accessoryStock.findUnique({
    where: { productModelId_locationId: { productModelId, locationId } },
    select: { avgCost: true },
  });
  // Need avgCost for the BR-7 snapshot; the quantity guard is the atomic decrement in applyStockMoves.
  if (!stock) throw new BadRequestException('This product has no stock at this location');
  const unitPrice = new Prisma.Decimal(line.unitPrice);
  return {
    data: {
      productModelId,
      quantity,
      unitPrice,
      unitCost: stock.avgCost, // BR-7 snapshot
      investorId: null,
      shareType: ShareType.NONE,
      shareValue: new Prisma.Decimal(0),
    },
    lineTotal: unitPrice.times(quantity),
    moveItemId: null,
    decrement: { productModelId, locationId, quantity },
  };
}
