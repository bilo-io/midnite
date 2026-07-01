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
  InboundSourceCreateRequestSchema,
  InboundSourceUpdateRequestSchema,
  type InboundSecretResponse,
  type InboundSourceResponse,
  type ListInboundSourcesResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../../auth/decorators/current-user.decorator';
import {
  InboundSourceDoesNotExistError,
  InboundSourceForbiddenError,
  InboundSourcesService,
} from './inbound-sources.service';

/** Team-scoped CRUD for inbound integration sources (Phase 46). */
@Controller('integrations/inbound')
export class InboundSourcesController {
  constructor(@Inject(InboundSourcesService) private readonly sources: InboundSourcesService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload | null): ListInboundSourcesResponse {
    return { sources: this.sources.list(user?.teamId ?? null) };
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload | null,
    @Body() body: unknown,
  ): InboundSecretResponse {
    const parsed = InboundSourceCreateRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.run(() =>
      this.sources.create(user?.teamId ?? null, user?.userId ?? null, parsed.data),
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param('id') id: string,
    @Body() body: unknown,
  ): InboundSourceResponse {
    const parsed = InboundSourceUpdateRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return {
      source: this.run(() =>
        this.sources.update(id, user?.teamId ?? null, user?.userId ?? null, parsed.data),
      ),
    };
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload | null, @Param('id') id: string): void {
    this.run(() => this.sources.remove(id, user?.teamId ?? null, user?.userId ?? null));
  }

  @Post(':id/rotate')
  rotate(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param('id') id: string,
  ): InboundSecretResponse {
    return this.run(() =>
      this.sources.rotateSecret(id, user?.teamId ?? null, user?.userId ?? null),
    );
  }

  /** Map domain errors to HTTP. */
  private run<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      if (err instanceof InboundSourceForbiddenError) throw new ForbiddenException(err.message);
      if (err instanceof InboundSourceDoesNotExistError) throw new NotFoundException(err.message);
      throw err;
    }
  }
}
