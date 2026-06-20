import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { ConfigModule } from './config.module';
import { CryptoModule } from './crypto/crypto.module';
import { DbModule } from './db/db.module';
import { EnvironmentModule } from './environment/environment.module';
import { FsModule } from './fs/fs.module';
import { HealthController } from './health/health.controller';
import { TasksModule } from './tasks/tasks.module';
import { AgentModule } from './agent/agent.module';
import { AgentsModule } from './agents/agents.module';
import { CouncilsModule } from './councils/councils.module';
import { MediaModule } from './media/media.module';
import { MarketModule } from './market/market.module';
import { MemoriesModule } from './memories/memories.module';
import { MetadataModule } from './metadata/metadata.module';
import { NewsModule } from './news/news.module';
import { NotesModule } from './notes/notes.module';
import { PoolModule } from './pool/pool.module';
import { ProjectsModule } from './projects/projects.module';
import { ProvidersModule } from './providers/providers.module';
import { RoutinesModule } from './routines/routines.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsageModule } from './usage/usage.module';
import { WeatherModule } from './weather/weather.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { TerminalModule } from './terminal/terminal.module';

@Module({
  imports: [
    ConfigModule,
    CryptoModule,
    DbModule,
    EnvironmentModule,
    FsModule,
    AgentModule,
    AgentsModule,
    CouncilsModule,
    MarketModule,
    MediaModule,
    MemoriesModule,
    MetadataModule,
    NewsModule,
    NotesModule,
    RoutinesModule,
    TasksModule,
    PoolModule,
    ProjectsModule,
    ProvidersModule,
    SessionsModule,
    UsageModule,
    WeatherModule,
    WorkflowsModule,
    TerminalModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
