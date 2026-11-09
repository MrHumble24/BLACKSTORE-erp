import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryMatchesDto } from './dto/query-matches.dto';
import { WatcherMatchDto } from './dto/watcher-match.dto';
import { MatchAlertService } from './match-alert.service';
import { MATCH_TRANSITIONS } from './match-status';

/** Fields of a match that leave the server; `sellerTelegramId` is stored but never returned. */
export const matchSelect = {
  id: true,
  externalId: true,
  watchId: true,
  watch: { select: { id: true, name: true } },
  status: true,
  device: true,
  price: true,
  currency: true,
  condition: true,
  confidence: true,
  sellerName: true,
  sellerUsername: true,
  messageText: true,
  messageLink: true,
  groupTitle: true,
  parentText: true,
  messageAt: true,
  receivedAt: true,
  statusChangedAt: true,
  note: true,
} satisfies Prisma.MatchSelect;

type MatchRow = Prisma.MatchGetPayload<{ select: typeof matchSelect }>;

/**
 * Matches (F34): seller offers the Watcher found. Rows are created only by the signed webhook
 * (not audited: no acting user); users list them, move them through MATCH_TRANSITIONS (BR-9) and
 * add a note (audited).
 */
@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly alerts: MatchAlertService,
  ) {}

  /**
   * Stores one webhook match. Idempotent on `matchId`: a repeat (Watcher retry) returns the
   * existing id with `duplicate: true`. 400 when the watch does not exist. A new match triggers
   * the optional owner alert in the background so the Watcher gets its 200 at once.
   */
  async ingest(dto: WatcherMatchDto): Promise<{ id: number; duplicate: boolean }> {
    const watch = await this.prisma.watch.findUnique({
      where: { id: Number(dto.watchExternalId) },
      select: { id: true, name: true },
    });
    if (!watch) throw new BadRequestException('Unknown watch');
    let match: MatchRow;
    try {
      match = await this.prisma.match.create({ data: toMatchData(dto, watch.id), select: matchSelect });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      const existing = await this.prisma.match.findUniqueOrThrow({
        where: { externalId: dto.matchId },
        select: { id: true },
      });
      return { id: existing.id, duplicate: true };
    }
    void this.alerts.notifyMatch(toMatch(match), watch.name); // never throws
    return { id: match.id, duplicate: false };
  }

  /** Paginated list, newest received first, optionally filtered by status and watch. */
  async findMany(query: QueryMatchesDto) {
    const where: Prisma.MatchWhereInput = { status: query.status, watchId: query.watchId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.match.findMany({
        where,
        select: matchSelect,
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.match.count({ where }),
    ]);
    return { items: rows.map(toMatch), total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * The one place a match changes status (BR-9): 404 missing, 400 move not allowed, 409 when
   * someone else changed it between the read and the conditional write. Audited as `{ status }`.
   */
  async changeStatus(id: number, to: MatchStatus, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id }, select: { status: true } });
      if (!match) throw new NotFoundException('Match not found');
      if (!MATCH_TRANSITIONS[match.status].includes(to)) {
        throw new BadRequestException(`Cannot move match from ${match.status} to ${to}`);
      }
      const result = await tx.match.updateMany({
        where: { id, status: match.status },
        data: { status: to, statusChangedAt: new Date(), statusChangedById: userId },
      });
      if (result.count === 0) throw new ConflictException('Match changed, try again');
      await this.audit.log(
        { userId, action: 'update', entity: 'Match', entityId: id, before: { status: match.status }, after: { status: to } },
        tx,
      );
      return toMatch(await tx.match.findUniqueOrThrow({ where: { id }, select: matchSelect }));
    });
  }

  /** Sets or clears the note (empty string clears it); 404 missing. Audited as `{ note }`. */
  async updateNote(id: number, note: string | null, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.match.findUnique({ where: { id }, select: { note: true } });
      if (!current) throw new NotFoundException('Match not found');
      const next = note?.trim() || null;
      const match = await tx.match.update({ where: { id }, data: { note: next }, select: matchSelect });
      await this.audit.log(
        { userId, action: 'update', entity: 'Match', entityId: id, before: { note: current.note }, after: { note: next } },
        tx,
      );
      return toMatch(match);
    });
  }
}

/** Maps the Watcher body to Match columns (contract names differ: group, matchId, createdAt). */
function toMatchData(dto: WatcherMatchDto, watchId: number): Prisma.MatchUncheckedCreateInput {
  return {
    externalId: dto.matchId,
    watchId,
    device: dto.device,
    price: dto.price ?? null,
    currency: dto.currency ?? null,
    condition: dto.condition ?? null,
    confidence: dto.confidence,
    sellerName: dto.sellerName ?? null,
    sellerTelegramId: dto.sellerTelegramId ?? null,
    sellerUsername: dto.sellerUsername ?? null,
    messageText: dto.messageText,
    messageLink: dto.messageLink ?? null,
    groupTitle: dto.group,
    parentText: dto.parentText ?? null,
    messageAt: new Date(dto.createdAt),
  };
}

/** API shape: price as a 2-decimal string, confidence as a 3-decimal string. */
function toMatch(m: MatchRow) {
  return { ...m, price: m.price?.toFixed(2) ?? null, confidence: m.confidence.toFixed(3) };
}
