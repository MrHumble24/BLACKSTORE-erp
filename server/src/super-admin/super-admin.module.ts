import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BackupsModule } from '../backups/backups.module';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';

/**
 * Super-admin destructive operations (F12). Pulls in AuthModule (password re-auth) and
 * BackupsModule (fresh pre-delete backup); AuditService/PrismaService are global.
 */
@Module({
  imports: [AuthModule, BackupsModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
