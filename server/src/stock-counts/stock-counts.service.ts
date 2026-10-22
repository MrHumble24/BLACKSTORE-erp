import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { ItemBrief, itemBriefSelect } from '../common/item-brief';
import { assertActiveLocation } from '../items/item-queries';
import { normalizeIdentifier } from '../items/item-validation';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateStockCountDto } from './dto/create-stock-count.dto';
import { QueryStockCountsDto } from './dto/query-stock-counts.dto';
import { classifyScan, computeResult, ScanStatus } from './stock-count-result';

const summarySelect = {
  id: true,
  startedAt: true,
  finishedAt: true,
  location: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  _count: { select: { scans: true } },
} satisfies Prisma.StockCountSelect;

const detailSelect = {
  id: true,
  startedAt: true,
  finishedAt: true,
  location: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  scans: {
    select: { scannedCode: true, scannedAt: true, item: { select: itemBriefSelect } },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.StockCountSelect;

type SummaryRow = Prisma.StockCountGetPayload<{ select: typeof summarySelect }>;

/** Physical stock counts: start, scan, read result, finish (FR-6, W7). */
@Injectable()
export class StockCountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Starts a count; 409 if the location already has an open one. */
  async create(dto: CreateStockCountDto, actor: PublicUser) {
    const id = await this.prisma.$transaction(async (tx) => {
      await assertActiveLocation(tx, dto.locationId);
      // ponytail: "one open count per location" has no DB constraint; a concurrent start could slip through. A partial unique index on (locationId) WHERE finishedAt IS NULL is the upgrade.
      const open = await tx.stockCount.findFirst({
        where: { locationId: dto.locationId, finishedAt: null },
        select: { id: true },
      });
      if (open) throw new ConflictException('This location already has an open stock count');
      const count = await tx.stockCount.create({
        data: { locationId: dto.locationId, userId: actor.id },
        select: { id: true },
      });
      await this.audit.log(
        { userId: actor.id, action: 'start', entity: 'StockCount', entityId: count.id, after: { locationId: dto.locationId } },
        tx,
      );
      return count.id;
    });
    return this.loadWithResult(id);
  }

  /** Paginated, newest-first list with the scan count. */
  async findAll(query: QueryStockCountsDto) {
    const where: Prisma.StockCountWhereInput = { locationId: query.locationId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.stockCount.findMany({
        where,
        select: summarySelect,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.stockCount.count({ where }),
    ]);
    return { items: rows.map(toSummary), total, page: query.page, pageSize: query.pageSize };
  }

  /** One count with its result computed against the current stock. */
  findOne(id: number) {
    return this.loadWithResult(id);
  }

  /** Records a scan; a repeat of the same code returns the first scan marked DUPLICATE (no new row). */
  async scan(id: number, dto: CreateScanDto) {
    const count = await this.prisma.stockCount.findUnique({
      where: { id },
      select: { finishedAt: true, locationId: true },
    });
    if (!count) throw new NotFoundException('Stock count not found');
    if (count.finishedAt) throw new BadRequestException('This stock count is finished');

    const code = normalizeIdentifier(dto.code);
    const identifier = await this.prisma.itemIdentifier.findUnique({
      where: { value: code },
      select: { item: { select: itemBriefSelect } },
    });
    const item = identifier?.item ?? null;
    const status = classifyScan(item, count.locationId);
    return this.saveScan(id, code, status, item);
  }

  /** Finishes a count; 400 if already finished. */
  async finish(id: number, actor: PublicUser) {
    await this.prisma.$transaction(async (tx) => {
      const count = await tx.stockCount.findUnique({ where: { id }, select: { finishedAt: true } });
      if (!count) throw new NotFoundException('Stock count not found');
      if (count.finishedAt) throw new BadRequestException('This stock count is already finished');
      await tx.stockCount.update({ where: { id }, data: { finishedAt: new Date() } });
      await this.audit.log({ userId: actor.id, action: 'finish', entity: 'StockCount', entityId: id }, tx);
    });
    return this.loadWithResult(id);
  }

  /** Creates the scan row; a (count, code) duplicate returns the stored scan as DUPLICATE (HTTP 200). */
  private async saveScan(
    stockCountId: number,
    code: string,
    status: Exclude<ScanStatus, 'DUPLICATE'>,
    item: ItemBrief | null,
  ) {
    // Scans are not audited: the scan row is itself the record (FR-30).
    try {
      const scan = await this.prisma.stockCountScan.create({
        data: { stockCountId, scannedCode: code, itemId: item?.id ?? null },
        select: { id: true, scannedAt: true },
      });
      return { id: scan.id, code, status, item, scannedAt: scan.scannedAt };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return this.existingScan(stockCountId, code);
      }
      throw e;
    }
  }

  /** The already-stored scan for this code, returned as DUPLICATE. */
  private async existingScan(stockCountId: number, code: string) {
    const scan = await this.prisma.stockCountScan.findUniqueOrThrow({
      where: { stockCountId_scannedCode: { stockCountId, scannedCode: code } },
      select: { id: true, scannedAt: true, item: { select: itemBriefSelect } },
    });
    return { id: scan.id, code, status: 'DUPLICATE' as const, item: scan.item, scannedAt: scan.scannedAt };
  }

  /** Loads a count and computes its result from the items IN_STOCK at the location now. */
  private async loadWithResult(id: number) {
    const count = await this.prisma.stockCount.findUnique({ where: { id }, select: detailSelect });
    if (!count) throw new NotFoundException('Stock count not found');
    const expected = await this.prisma.item.findMany({
      where: { status: ItemStatus.IN_STOCK, locationId: count.location.id },
      select: itemBriefSelect,
    });
    return {
      id: count.id,
      location: count.location,
      user: count.user,
      startedAt: count.startedAt,
      finishedAt: count.finishedAt,
      scannedCount: count.scans.length,
      result: computeResult(expected, count.scans),
    };
  }
}

/** Maps a list row to StockCountSummary. */
function toSummary(row: SummaryRow) {
  const { _count } = row;
  return {
    id: row.id,
    location: row.location,
    user: row.user,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    scannedCount: _count.scans,
  };
}
