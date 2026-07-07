import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config.module';
import { ChecksModule } from './checks/checks.module';
import { CryptoModule } from './crypto/crypto.module';
import { DbModule } from './db/db.module';
import { RuntimeMetaModule } from './runtime/runtime-meta.module';
import { EnvironmentModule } from './environment/environment.module';
import { FsModule } from './fs/fs.module';
import { HealthModule } from './health/health.module';
import { TaskHealthModule } from './tasks/task-health.module';
import { TasksModule } from './tasks/tasks.module';
import { TaskCreatorModule } from './tasks/task-creator.module';
import { AgentModule } from './agent/agent.module';
import { ChatModule } from './chat/chat.module';
import { AgentsModule } from './agents/agents.module';
import { CouncilsModule } from './councils/councils.module';
import { MediaModule } from './media/media.module';
import { MarketModule } from './market/market.module';
import { MemoriesModule } from './memories/memories.module';
import { MetadataModule } from './metadata/metadata.module';
import { NewsModule } from './news/news.module';
import { NotesModule } from './notes/notes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PoolModule } from './pool/pool.module';
import { PortabilityModule } from './portability/portability.module';
import { ProjectsModule } from './projects/projects.module';
import { MilestonesModule } from './milestones/milestones.module';
import { ProvidersModule } from './providers/providers.module';
import { ReposModule } from './repos/repos.module';
import { RetroModule } from './retro/retro.module';
import { RoutinesModule } from './routines/routines.module';
import { SearchModule } from './search/search.module';
import { SearchIndexModule } from './search/search-index.module';
import { SessionsModule } from './sessions/sessions.module';
import { SetupModule } from './setup/setup.module';
import { MetricsModule } from './metrics/metrics.module';
import { SystemModule } from './system/system.module';
import { UsageModule } from './usage/usage.module';
import { WeatherModule } from './weather/weather.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { WorkflowCredentialsModule } from './workflows/credentials/workflow-credentials.module';
import { WorkflowTemplatesModule } from './workflow-templates/workflow-templates.module';
import { TerminalModule } from './terminal/terminal.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AuditModule } from './audit/audit.module';
import { TeamsModule } from './teams/teams.module';
import { WsModule } from './ws/ws.module';
import { ServiceTokensModule } from './service-tokens/service-tokens.module';
import { IdeasModule } from './ideas/ideas.module';
import { PhaseDocsModule } from './phase-docs/phase-docs.module';
import { PreferencesModule } from './preferences/preferences.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { InboundModule } from './integrations/inbound/inbound.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    ChecksModule,
    CryptoModule,
    DbModule,
    RuntimeMetaModule,
    EnvironmentModule,
    FsModule,
    HealthModule,
    AgentModule,
    AgentsModule,
    ChatModule,
    CouncilsModule,
    MarketModule,
    MediaModule,
    MemoriesModule,
    MetadataModule,
    NewsModule,
    NotesModule,
    NotificationsModule,
    RoutinesModule,
    SearchIndexModule,
    SearchModule,
    RetroModule,
    TasksModule,
    TaskHealthModule,
    TaskCreatorModule,
    PoolModule,
    PortabilityModule,
    ProjectsModule,
    MilestonesModule,
    ProvidersModule,
    ReposModule,
    MetricsModule,
    SystemModule,
    SessionsModule,
    SetupModule,
    UsageModule,
    WeatherModule,
    WorkflowsModule,
    WorkflowCredentialsModule,
    WorkflowTemplatesModule,
    TerminalModule,
    ApprovalsModule,
    TeamsModule,
    WsModule,
    AuditModule,
    AdminModule,
    ServiceTokensModule,
    IdeasModule,
    PhaseDocsModule,
    PreferencesModule,
    WebhooksModule,
    InboundModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
