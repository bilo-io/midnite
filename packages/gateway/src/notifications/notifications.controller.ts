import { BadRequestException, Body, Controller, Delete, Get, Inject, Post, Query } from '@nestjs/common';
import {
  MarkReadRequestSchema,
  NotificationListQuerySchema,
  type NotificationListResponse,
} from '@midnite/shared';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}

  @Get()
  list(@Query() query: unknown): NotificationListResponse {
    const parsed = NotificationListQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.list(parsed.data);
  }

  @Post('read')
  markRead(@Body() body: unknown): { unread: number } {
    const parsed = MarkReadRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.markRead(parsed.data);
  }

  @Delete()
  clear(): { ok: true } {
    this.service.clear();
    return { ok: true };
  }
}
