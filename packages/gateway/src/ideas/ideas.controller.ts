import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateIdeaRequestSchema,
  IdeaChatRequestSchema,
  IdeaQuerySchema,
  UpdateIdeaRequestSchema,
  type Idea,
  type IdeaChatResponse,
  type IdeaMessage,
  type IdeasResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { IdeaService } from './ideas.service';

const DEFAULT_SCOPE = { userId: 'anonymous', teamId: null };

function toScope(user: CurrentUserPayload | null | undefined) {
  return user ? { userId: user.userId, teamId: user.teamId } : DEFAULT_SCOPE;
}

@Controller('ideas')
export class IdeaController {
  constructor(private readonly service: IdeaService) {}

  @Get()
  list(
    @Query() rawQuery: Record<string, string>,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): IdeasResponse {
    const parsed = IdeaQuerySchema.safeParse(rawQuery);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const { ideas, total } = this.service.listIdeas(toScope(user), parsed.data);
    return { ideas, total };
  }

  @Post()
  @RequiresRole('member')
  create(
    @Body() rawBody: unknown,
    @CurrentUser() user: CurrentUserPayload,
  ): { idea: Idea } {
    const parsed = CreateIdeaRequestSchema.safeParse(rawBody);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const idea = this.service.createIdea(parsed.data, toScope(user));
    return { idea };
  }

  @Get(':id')
  get(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): { idea: Idea } {
    const idea = this.service.getIdea(id, toScope(user));
    return { idea };
  }

  @Patch(':id')
  @RequiresRole('member')
  update(
    @Param('id') id: string,
    @Body() rawBody: unknown,
    @CurrentUser() user: CurrentUserPayload,
  ): { idea: Idea } {
    const parsed = UpdateIdeaRequestSchema.safeParse(rawBody);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const idea = this.service.updateIdea(id, parsed.data, toScope(user));
    return { idea };
  }

  @Delete(':id')
  @HttpCode(204)
  @RequiresRole('member')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): void {
    this.service.deleteIdea(id, toScope(user));
  }

  @Get(':id/messages')
  listMessages(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): { messages: IdeaMessage[] } {
    const messages = this.service.listMessages(id, toScope(user));
    return { messages };
  }

  @Post(':id/messages')
  @RequiresRole('member')
  sendMessage(
    @Param('id') id: string,
    @Body() rawBody: unknown,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<IdeaChatResponse> {
    const parsed = IdeaChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.chat(id, parsed.data.content, toScope(user));
  }
}
