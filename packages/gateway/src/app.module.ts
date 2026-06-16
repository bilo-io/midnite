import { Module } from '@nestjs/common';
import { ConfigModule } from './config.module';
import { DbModule } from './db/db.module';
import { FsModule } from './fs/fs.module';
import { HealthController } from './health/health.controller';
import { TasksModule } from './tasks/tasks.module';
import { AgentModule } from './agent/agent.module';
import { AgentsModule } from './agents/agents.module';
import { CouncilsModule } from './councils/councils.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { MediaModule } from './media/media.module';
import { MemoriesModule } from './memories/memories.module';
import { NewsModule } from './news/news.module';
import { NotesModule } from './notes/notes.module';
import { ProjectsModule } from './projects/projects.module';
import { RoutinesModule } from './routines/routines.module';
import { SessionsModule } from './sessions/sessions.module';
import { WeatherModule } from './weather/weather.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { TerminalModule } from './terminal/terminal.module';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    FsModule,
    AgentModule,
    AgentsModule,
    CouncilsModule,
    KnowledgeModule,
    MediaModule,
    MemoriesModule,
    NewsModule,
    NotesModule,
    RoutinesModule,
    TasksModule,
    ProjectsModule,
    SessionsModule,
    WeatherModule,
    WorkflowsModule,
    TerminalModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
