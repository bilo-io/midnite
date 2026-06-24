import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [DbModule, TeamsModule],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
