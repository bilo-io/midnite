import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { DbModule } from '../db/db.module';
import { TasksModule } from '../tasks/tasks.module';
import { TeamsModule } from '../teams/teams.module';
import { WebhookDeliveriesRepository } from './webhook-deliveries.repository';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksRepository } from './webhooks.repository';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [DbModule, CryptoModule, TeamsModule, TasksModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksRepository,
    WebhooksService,
    WebhookDeliveriesRepository,
    WebhookDeliveryService,
  ],
  exports: [WebhooksService, WebhookDeliveryService, WebhookDeliveriesRepository],
})
export class WebhooksModule {}
