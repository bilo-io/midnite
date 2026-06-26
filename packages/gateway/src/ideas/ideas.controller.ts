import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
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
import { ZodValidationPipe } from '../lib/zod-validation.pipe';
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
    @Query(new ZodValidationPipe(IdeaQuerySchema)) query: { status?: string; q?: string; page?: number; limit?: number },
    @CurrentUser() user?: CurrentUserPayload | null,
  ): IdeasResponse {
    const { ideas, total } = this.service.listIdeas(toScope(user), query);
    return { ideas, total };
  }

  @Post()
  @RequiresRole('member')
  create(
    @Body(new ZodValidationPipe(CreateIdeaRequestSchema)) body: { title: string; body?: string; tags?: string[] },
    @CurrentUser() user: CurrentUserPayload,
  ): { idea: Idea } {
    const idea = this.service.createIdea(body, toScope(user));
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
    @Body(new ZodValidationPipe(UpdateIdeaRequestSchema)) body: { title?: string; body?: string; tags?: string[] },
    @CurrentUser() user: CurrentUserPayload,
  ): { idea: Idea } {
    const idea = this.service.updateIdea(id, body, toScope(user));
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
  async sendMessage(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(IdeaChatRequestSchema)) body: { content: string },
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<IdeaChatResponse> {
    const userMessage = this.service.addUserMessage(id, body.content, toScope(user));
    // Assistant reply placeholder — Theme C wires the LLM here.
    const assistantMessage = this.service.addAssistantMessage(
      id,
      'Thank you for sharing your idea. Theme C will wire AI replies.',
    );
    return { userMessage, assistantMessage };
  }
}
