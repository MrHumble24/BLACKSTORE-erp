import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

/** GET /roles: any logged-in user. */
@Controller('roles')
export class RolesController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findRoles();
  }
}
