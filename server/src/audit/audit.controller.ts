import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '../common/decorators';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

/** Read-only audit log for Admins (PRD FR-30). */
@Controller('audit-log')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Permissions('view_audit_log')
  findAll(@Query() query: QueryAuditDto) {
    return this.audit.findMany(query);
  }
}
