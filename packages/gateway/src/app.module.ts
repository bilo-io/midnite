import { Module } from '@nestjs/common';
import { ConfigModule } from './config.module';
import { DbModule } from './db/db.module';
import { HealthController } from './health/health.controller';
import { TasksModule } from './tasks/tasks.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [ConfigModule, DbModule, AgentModule, TasksModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
