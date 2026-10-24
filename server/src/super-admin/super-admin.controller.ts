import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Permissions } from '../common/decorators';
import { HardDeleteDto, HardDeletePreviewDto } from './dto/hard-delete.dto';
import { SuperAdminService } from './super-admin.service';

/**
 * Super-admin-only destructive operations (F12). Every route needs the hard_delete
 * permission AND the service re-checks the SuperAdmin role (Admin must get 403).
 */
@Controller('super-admin')
@Permissions('hard_delete')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  // 200: a read-only report, not a new resource.
  @Post('hard-delete/preview')
  @HttpCode(200)
  preview(@Body() dto: HardDeletePreviewDto, @CurrentUser() actor: PublicUser) {
    return this.service.preview(actor, dto);
  }

  // 200: an action on existing data, not a created resource.
  @Post('hard-delete')
  @HttpCode(200)
  hardDelete(@Body() dto: HardDeleteDto, @CurrentUser() actor: PublicUser) {
    return this.service.execute(actor, dto);
  }
}
