import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWatchDto } from './dto/create-watch.dto';
import { UpdateWatchDto } from './dto/update-watch.dto';
import { WatchSyncService } from './watch-sync.service';

/** Fields of a watch that leave the server (F34 contract `Watch`). */
const watchSelect = {
  id: true,
  name: true,
  aliases: true,
  productModelId: true,
  productModel: { select: { id: true, name: true } },
  maxPrice: true,
  currency: true,
  isActive: true,
  syncedAt: true,
  updatedAt: true,
  createdAt: true,
} satisfies Prisma.WatchSelect;

/** Watcher limit: it receives every watch (inactive too), so the ERP refuses the 201st. */
const MAX_WATCHES = 200;

type WatchRow = Prisma.WatchGetPayload<{ select: typeof watchSelect }>;

/**
 * Trims, lower-cases and de-duplicates aliases (order kept). Nothing more: the Watcher does the
 * real text normalisation, the ERP only avoids storing obvious duplicates.
 */
export function cleanAliases(aliases: string[]): string[] {
  return [...new Set(aliases.map((a) => a.trim().toLowerCase()).filter((a) => a.length > 0))];
}

/**
 * Watches (F34): devices the owner wants to buy, later pushed to the Watcher. Never deleted
 * (BR-12); `isActive` switches one off. Every change is audited (FR-30).
 */
@Injectable()
export class WatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sync: WatchSyncService,
  ) {}

  /** Paginated, newest-first list of every watch (active and inactive). */
  async findMany(query: PaginationQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.watch.findMany({
        select: watchSelect,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.watch.count(),
    ]);
    return { items: rows.map(toWatch), total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * Creates a watch with cleaned aliases (409 past MAX_WATCHES), audits it in the same
   * transaction, then pushes it.
   */
  async create(dto: CreateWatchDto, actorId: number) {
    const created = await this.prisma.$transaction(async (tx) => {
      if ((await tx.watch.count()) >= MAX_WATCHES) {
        throw new ConflictException(`At most ${MAX_WATCHES} watches`);
      }
      const watch = await tx.watch.create({
        data: { ...dto, aliases: cleanAliases(dto.aliases), createdById: actorId },
        select: watchSelect,
      });
      const after = toWatch(watch);
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'Watch', entityId: watch.id, after },
        tx,
      );
      return after;
    });
    void this.sync.pushIfStale(); // after commit; never throws, the cron is the safety net
    return created;
  }

  /**
   * Edits a watch (404 if missing); `updatedAt` moves, so the later sync cron sees it as unsynced.
   * An empty body is a no-op (no write, no audit) so `updatedAt` stays put. Pushes after commit.
   */
  async update(id: number, dto: UpdateWatchDto, actorId: number) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.watch.findUnique({ where: { id }, select: watchSelect });
      if (!current) throw new NotFoundException('Watch not found');
      if (Object.values(dto).every((v) => v === undefined)) return toWatch(current);
      const watch = await tx.watch.update({
        where: { id },
        data: { ...dto, aliases: dto.aliases ? cleanAliases(dto.aliases) : undefined },
        select: watchSelect,
      });
      const after = toWatch(watch);
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'Watch', entityId: id, before: toWatch(current), after },
        tx,
      );
      return after;
    });
    void this.sync.pushIfStale(); // no-op when nothing is stale (e.g. the empty-body case)
    return updated;
  }
}

/** API shape: maxPrice as a 2-decimal string. */
function toWatch(w: WatchRow) {
  return { ...w, maxPrice: w.maxPrice?.toFixed(2) ?? null };
}
