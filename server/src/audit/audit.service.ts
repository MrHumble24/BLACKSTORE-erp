import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId: number;
  action: string;
  entity: string;
  entityId: number;
  before?: object | null;
  after?: object | null;
}

/** Writes AuditLog rows. Shared by every module that creates or changes records. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saves one audit row; passwordHash is removed at any depth before saving.
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
}

function toSafeJson(
  value: object | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return JSON.parse(
    JSON.stringify(value, (key, v: unknown) =>
      key === 'passwordHash' ? undefined : v,
    ),
  ) as Prisma.InputJsonValue;
}
