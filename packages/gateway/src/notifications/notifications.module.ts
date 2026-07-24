import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TasksModule } from '../tasks/tasks.module';
import { NOTIFICATION_CHANNELS, type NotificationChannel } from './channels/notification-channel';
import { WebChannel } from './channels/web.channel';
import { WebhookChannel } from './channels/webhook.channel';
import { NotificationDispatcher } from './notification-dispatcher.service';
import { NotificationEventBus } from './notification-event-bus';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

/**
 * Notifications & alerting (Phase 21). Subscribes to the task event bus (Theme
 * A), applies the notify-policy, persists a feed, and fans each notification to
 * the enabled channels via the dispatcher (Theme B): the always-on WebChannel
 * (emits notification.created over WS) + an optional SSRF-guarded WebhookChannel.
 * Adding a channel = register the class + list it in NOTIFICATION_CHANNELS.
 */
@Module({
  // AuthModule: exports JwtService so NotificationsGateway's WS handshake can
  // resolve it — without the import its @Optional injection was silently
  // undefined and the feed's socket could never scope by user under JWT auth.
  imports: [AuthModule, TasksModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationEventBus,
    NotificationsGateway,
    NotificationDispatcher,
    WebChannel,
    WebhookChannel,
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (...channels: NotificationChannel[]) => channels,
      inject: [WebChannel, WebhookChannel],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
