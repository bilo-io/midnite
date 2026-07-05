import { Module } from '@nestjs/common';
import { CouncilsModule } from '../councils/councils.module';
import { IdeasModule } from '../ideas/ideas.module';
import { MemoriesModule } from '../memories/memories.module';
import { NotesModule } from '../notes/notes.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

/**
 * Querying + backfill over the global index. Imports the domain modules to read
 * them for (re)indexing; the index maintainer itself is provided globally by
 * `SearchIndexModule`. No domain repositories are touched — only their services.
 */
@Module({
  imports: [
    TasksModule,
    ProjectsModule,
    MemoriesModule,
    NotesModule,
    CouncilsModule,
    WorkflowsModule,
    IdeasModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  // Exported so the Phase 49 C import service can rebuild the index in-process
  // after a restore (the search index is derived, never carried in the archive).
  exports: [SearchService],
})
export class SearchModule {}
