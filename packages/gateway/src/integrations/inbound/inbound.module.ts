import { Module } from '@nestjs/common';
import { CryptoModule } from '../../crypto/crypto.module';
import { DbModule } from '../../db/db.module';
import { TasksModule } from '../../tasks/tasks.module';
import { TeamsModule } from '../../teams/teams.module';
import { InboundDeliveriesRepository } from './inbound-deliveries.repository';
import { InboundReceiverController } from './inbound-receiver.controller';
import { InboundReceiverService } from './inbound-receiver.service';
import { InboundSourcesController } from './inbound-sources.controller';
import { InboundSourcesRepository } from './inbound-sources.repository';
import { InboundSourcesService } from './inbound-sources.service';

/**
 * Inbound integrations (Phase 46). Theme A: team-scoped source entity + CRUD.
 * Themes B/C: the signed receiver (`POST /integrations/inbound/:id`) that verifies
 * a provider HMAC, maps the payload via a provider adapter, and creates a task.
 */
@Module({
  imports: [DbModule, CryptoModule, TeamsModule, TasksModule],
  controllers: [InboundSourcesController, InboundReceiverController],
  providers: [
    InboundSourcesRepository,
    InboundSourcesService,
    InboundDeliveriesRepository,
    InboundReceiverService,
  ],
  exports: [InboundSourcesService, InboundSourcesRepository, InboundDeliveriesRepository],
})
export class InboundModule {}
