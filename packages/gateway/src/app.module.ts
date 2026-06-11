import { Module } from '@nestjs/common';
import { ConfigModule } from './config.module';
import { DbModule } from './db/db.module';
import { FsModule } from './fs/fs.module';
import { HealthController } from './health/health.controller';
import { TasksModule } from './tasks/tasks.module';
import { AgentModule } from './agent/agent.module';
import { AgentsModule } from './agents/agents.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { ProjectsModule } from './projects/projects.module';
import { SessionsModule } from './sessions/sessions.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { TerminalModule } from './terminal/terminal.module';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    FsModule,
    AgentModule,
    AgentsModule,
    KnowledgeModule,
    TasksModule,
    ProjectsModule,
    SessionsModule,
    WorkflowsModule,
    TerminalModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
