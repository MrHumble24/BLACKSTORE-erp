import { Controller, Get } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators';
import { DashboardService } from './dashboard.service';

/** Home dashboard (F10). Any authenticated user; profit fields are masked per role in the service. */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() actor: PublicUser) {
    return this.dashboard.summary(actor);
  }
}
