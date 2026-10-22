import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/** Wires the users and roles endpoints to UsersService (PRD FR-29). */
@Module({
  controllers: [UsersController, RolesController],
  providers: [UsersService],
})
export class UsersModule {}
