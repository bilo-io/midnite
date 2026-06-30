import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  WebhookCreateRequestSchema,
  WebhookUpdateRequestSchema,
  type ListWebhooksResponse,
  type WebhookResponse,
  type WebhookSecretResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import {
  UnsafeWebhookUrlError,
  WebhookDoesNotExistError,
  WebhookForbiddenError,
  WebhooksService,
} from './webhooks.service';

/** Team-scoped CRUD for outbound webhook endpoints (Phase 44). */
@Controller('webhooks')
export class WebhooksController {
  constructor(@Inject(WebhooksService) private readonly webhooks: WebhooksService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload | null): ListWebhooksResponse {
    return { webhooks: this.webhooks.list(user?.teamId ?? null) };
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload | null,
    @Body() body: unknown,
  ): WebhookSecretResponse {
    const parsed = WebhookCreateRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.run(() => this.webhooks.create(user?.teamId ?? null, user?.userId ?? null, parsed.data));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param('id') id: string,
    @Body() body: unknown,
  ): WebhookResponse {
    const parsed = WebhookUpdateRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      webhook: this.run(() =>
        this.webhooks.update(id, user?.teamId ?? null, user?.userId ?? null, parsed.data),
      ),
    };
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload | null, @Param('id') id: string): void {
    this.run(() => this.webhooks.remove(id, user?.teamId ?? null, user?.userId ?? null));
  }

  @Post(':id/rotate')
  rotate(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param('id') id: string,
  ): WebhookSecretResponse {
    return this.run(() =>
      this.webhooks.rotateSecret(id, user?.teamId ?? null, user?.userId ?? null),
    );
  }

  /** Map domain errors to HTTP. */
  private run<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      if (err instanceof WebhookForbiddenError) throw new ForbiddenException(err.message);
      if (err instanceof WebhookDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof UnsafeWebhookUrlError) throw new BadRequestException(err.message);
      throw err;
    }
  }
}
