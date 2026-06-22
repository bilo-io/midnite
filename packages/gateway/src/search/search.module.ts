import { Module } from '@nestjs/common';
import { CouncilsModule } from '../councils/councils.module';
import { MemoriesModule } from '../memories/memories.module';
import { NotesModule } from '../notes/notes.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

// Composes the domain services for backfill/reindex reads. The low-level
// `SearchIndexService` it uses comes from the global `SearchIndexModule`, so the
// domains can maintain their own index rows on the write-path without depending
// on this module (which would invert the dependency).
@Module({
  imports: [
    TasksModule,
    ProjectsModule,
    MemoriesModule,
    NotesModule,
    CouncilsModule,
    WorkflowsModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
