import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [DbModule, TeamsModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
