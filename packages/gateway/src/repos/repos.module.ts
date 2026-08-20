import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsCoreModule } from '../projects/projects-core.module';
import { ReposController } from './repos.controller';
import { ReposRepository } from './repos.repository';
import { ReposService } from './repos.service';

@Module({
  // ProjectsCoreModule (the bare ProjectsRepository) so deleting a repo can clear
  // its project edges without importing the whole ProjectsModule — which would
  // close a cycle, since ProjectsModule imports this one (Phase 84 C).
  imports: [AuthModule, ProjectsCoreModule],
  controllers: [ReposController],
  providers: [ReposService, ReposRepository],
  exports: [ReposService],
})
export class ReposModule {}
