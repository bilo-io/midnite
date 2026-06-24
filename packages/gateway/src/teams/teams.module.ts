import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module.js';
import { TeamsController } from './teams.controller.js';
import { TeamsRepository } from './teams.repository.js';
import { TeamsService } from './teams.service.js';

@Module({
  imports: [DbModule],
  controllers: [TeamsController],
  providers: [TeamsRepository, TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
