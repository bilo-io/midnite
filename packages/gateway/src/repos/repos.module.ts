import { Module } from '@nestjs/common';
import { ReposController } from './repos.controller';
import { ReposRepository } from './repos.repository';
import { ReposService } from './repos.service';

@Module({
  controllers: [ReposController],
  providers: [ReposService, ReposRepository],
  exports: [ReposService],
})
export class ReposModule {}
