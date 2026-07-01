import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateDeckRequestSchema,
  UpdateDeckRequestSchema,
  type DeckResponse,
  type DeckSummary,
  type TeamScope,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { SlidesService } from './slides.service';

function toScope(user: CurrentUserPayload | null | undefined): TeamScope | undefined {
  return user ? { userId: user.userId, teamId: user.teamId } : undefined;
}

@Controller('slides')
export class SlidesController {
  constructor(@Inject(SlidesService) private readonly service: SlidesService) {}

  @Get()
  list(@CurrentUser() user?: CurrentUserPayload | null): DeckSummary[] {
    return this.service.listSummaries(toScope(user));
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): DeckResponse {
    return { deck: this.service.getDeck(id, toScope(user)) };
  }

  @Post()
  @RequiresRole('member')
  create(@Body() body: unknown, @CurrentUser() user?: CurrentUserPayload | null): DeckResponse {
    const parsed = CreateDeckRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { deck: this.service.create(parsed.data, toScope(user)) };
  }

  @Patch(':id')
  @RequiresRole('member')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): DeckResponse {
    const parsed = UpdateDeckRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { deck: this.service.update(id, parsed.data, toScope(user)) };
  }

  @Delete(':id')
  @RequiresRole('member')
  remove(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): { ok: true } {
    this.service.delete(id, toScope(user));
    return { ok: true };
  }
}
