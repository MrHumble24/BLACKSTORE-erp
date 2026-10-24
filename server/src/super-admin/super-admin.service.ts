import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { BackupsService } from '../backups/backups.service';
import type { PublicUser } from '../common/auth-user';
import { SUPER_ADMIN_ROLE } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { HardDeleteDto, HardDeletePreviewDto, HardDeleteType } from './dto/hard-delete.dto';
import { deleteTargets, snapshotRows } from './hard-delete-exec';
import { collectTargets, HardDeleteReport } from './hard-delete-targets';

/** AuditLog.entity name for each deletable type. */
const ENTITY: Record<HardDeleteType, string> = {
  item: 'Item',
  productModel: 'ProductModel',
  category: 'Category',
};

/**
 * Super-admin-only permanent delete (F12, overrides BR-12). Destructive and irreversible:
 * re-auth by password, a fresh backup, a full audit snapshot and one transaction guard every call.
 */
@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly backups: BackupsService,
    private readonly auth: AuthService,
  ) {}

  /** Defense in depth: @Permissions('hard_delete') on the route AND this role check here. */
  private assertSuperAdmin(actor: PublicUser): void {
    if (actor.role.name !== SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Only the super admin can do this');
    }
  }

  /** Read-only blast radius for a would-be hard delete; makes no writes. */
  async preview(actor: PublicUser, dto: HardDeletePreviewDto): Promise<HardDeleteReport> {
    this.assertSuperAdmin(actor);
    const targets = await collectTargets(this.prisma, dto);
    return targets.report;
  }

  /**
   * Permanently deletes the target and everything under it. Steps, in order:
   * 1) re-authenticate the caller's password (wrong → 401, nothing deleted);
   * 2) take a fresh backup first (if it fails we abort — no delete without a recovery point);
   * 3) one transaction: recompute targets, snapshot every row, then delete children-before-parents.
   */
  async execute(actor: PublicUser, dto: HardDeleteDto): Promise<{ deleted: HardDeleteReport }> {
    this.assertSuperAdmin(actor);
    await this.auth.verifyPassword(actor.id, dto.password);

    // No recovery point = no delete. A failed backup throws and aborts before any row is touched.
    const backup = await this.backups.run();
    this.logger.warn(
      `HARD_DELETE ${dto.type}#${dto.id} by user ${actor.id}; recovery backup ${backup.fileName}`,
    );

    const report = await this.prisma.$transaction(async (tx) => {
      // Recompute inside the txn so we snapshot and delete exactly one, consistent set.
      const targets = await collectTargets(tx, dto);
      const before = await snapshotRows(tx, targets);
      // Full-row snapshot BEFORE deleting; the AuditLog row itself is never deleted (see below).
      await this.audit.log(
        {
          userId: actor.id,
          action: 'HARD_DELETE',
          entity: ENTITY[dto.type],
          entityId: dto.id,
          before,
          after: { backupRef: backup.fileName, target: { type: dto.type, id: dto.id } },
        },
        tx,
      );
      await deleteTargets(tx, targets);
      return targets.report;
    });

    return { deleted: report };
  }
}
