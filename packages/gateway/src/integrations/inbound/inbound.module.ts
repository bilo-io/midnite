import { Module } from '@nestjs/common';
import { CryptoModule } from '../../crypto/crypto.module';
import { DbModule } from '../../db/db.module';
import { TeamsModule } from '../../teams/teams.module';
import { InboundSourcesController } from './inbound-sources.controller';
import { InboundSourcesRepository } from './inbound-sources.repository';
import { InboundSourcesService } from './inbound-sources.service';

/**
 * Inbound integrations (Phase 46). Theme A ships the team-scoped source entity +
 * CRUD; the signed receiver + provider adapters + deliveries log land in B–D.
 */
@Module({
  imports: [DbModule, CryptoModule, TeamsModule],
  controllers: [InboundSourcesController],
  providers: [InboundSourcesRepository, InboundSourcesService],
  exports: [InboundSourcesService, InboundSourcesRepository],
})
export class InboundModule {}
