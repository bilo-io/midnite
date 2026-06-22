import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { NotificationEventBus } from './notification-event-bus';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

/**
 * Notifications & alerting (Phase 21 Theme A). Subscribes to the task event bus
 * (imported from TasksModule, which exports it), applies the notify-policy,
 * persists a feed, and fans `notification.created` over WS. Channel dispatch
 * (browser/webhook) is Theme B.
 */
@Module({
  imports: [TasksModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationEventBus,
    NotificationsGateway,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
