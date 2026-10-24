import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { dateRange } from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';

export interface AuditEntry {
  userId: number;
  action: string;
  entity: string;
  entityId: number;
  before?: object | null;
  after?: object | null;
}

/** Keys scrubbed from every audited before/after snapshot: a secret and a private contact id. */
const REDACTED_KEYS = new Set(['passwordHash', 'telegramChatId']);

/** Fields of an audit row that leave the server (Admin only); before/after returned as stored. */
const auditSelect = {
  id: true,
  createdAt: true,
  action: true,
  entity: true,
  entityId: true,
  before: true,
  after: true,
  user: { select: { id: true, name: true } },
} satisfies Prisma.AuditLogSelect;

/** Writes AuditLog rows. Shared by every module that creates or changes records. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saves one audit row; passwordHash and telegramChatId are removed at any depth before saving
   * (secret / private contact data must never land in the audit trail or GET /audit-log).
   * Pass the transaction client (tx) to write it inside the same transaction as the change.
   */
  async log(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: toSafeJson(entry.before),
        after: toSafeJson(entry.after),
      },
    });
  }

  /** Read-only, paginated audit trail with exact-match filters (FR-30); newest first. */
  async findMany(query: QueryAuditDto) {
    const where: Prisma.AuditLogWhereInput = {
      entity: query.entity,
      entityId: query.entityId,
      userId: query.userId,
      action: query.action,
      createdAt: dateRange(query.from, query.to),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: auditSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}

function toSafeJson(
  value: object | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return JSON.parse(
    JSON.stringify(value, (key, v: unknown) => (REDACTED_KEYS.has(key) ? undefined : v)),
  ) as Prisma.InputJsonValue;
}
