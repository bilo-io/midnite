import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post, Query } from '@nestjs/common';
import {
  MarkReadRequestSchema,
  NotificationListQuerySchema,
  type NotificationListResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}

  @Get()
  list(
    @Query() query: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): NotificationListResponse {
    const parsed = NotificationListQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.list(parsed.data, scope);
  }

  @Post('read')
  markRead(@Body() body: unknown): { unread: number } {
    const parsed = MarkReadRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.markRead(parsed.data);
  }

  @Delete(':id')
  dismiss(@Param('id') id: string): { ok: true } {
    this.service.remove(id);
    return { ok: true };
  }

  @Delete()
  clear(): { ok: true } {
    this.service.clear();
    return { ok: true };
  }
}
