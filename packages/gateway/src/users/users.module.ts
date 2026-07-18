import { Module } from '@nestjs/common';
import { UserIdentitiesRepository } from '../auth/user-identities.repository';
import { DbModule } from '../db/db.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [DbModule, TeamsModule],
  controllers: [UsersController],
  // UserIdentitiesRepository lives under auth/ but is registered here (it needs
  // only the global DB_TOKEN) so UsersService can inject it for SSO linking
  // without an Auth↔Users module cycle (Phase 70 B).
  providers: [UsersRepository, UserIdentitiesRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
