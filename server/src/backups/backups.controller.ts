import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { BackupsService } from './backups.service';
import { RestoreBackupDto } from './dto/restore-backup.dto';

/** Backup management (FR-31), Admin only via manage_backups. */
@Controller('backups')
@Permissions('manage_backups')
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}

  @Get()
  list() {
    return this.backups.list();
  }

  @Post()
  run() {
    return this.backups.run();
  }

  // 200: a restore is an action on existing data, not a new resource.
  @Post(':fileName/restore')
  @HttpCode(200)
  restore(
    @Param('fileName') fileName: string,
    @Body() dto: RestoreBackupDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return this.backups.restore(fileName, dto.confirm, actor);
  }
}
