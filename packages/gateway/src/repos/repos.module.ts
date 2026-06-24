import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReposController } from './repos.controller';
import { ReposRepository } from './repos.repository';
import { ReposService } from './repos.service';

@Module({
  imports: [AuthModule],
  controllers: [ReposController],
  providers: [ReposService, ReposRepository],
  exports: [ReposService],
})
export class ReposModule {}
