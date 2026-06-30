import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { DbModule } from '../db/db.module';
import { TeamsModule } from '../teams/teams.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksRepository } from './webhooks.repository';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [DbModule, CryptoModule, TeamsModule],
  controllers: [WebhooksController],
  providers: [WebhooksRepository, WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
