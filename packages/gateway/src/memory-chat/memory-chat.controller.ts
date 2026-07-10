import { BadRequestException, Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import {
  PostMemoryChatRequestSchema,
  type MemoryChatHistoryResponse,
  type PostMemoryChatResponse,
} from '@midnite/shared';
import { MemoryChatService } from './memory-chat.service';

/**
 * Chat to the knowledge base (Phase 65 C). Thin — decode/validate and delegate;
 * the retrieval + answer logic lives in {@link MemoryChatService}. Shares the
 * `/memories/:id` prefix with the memories controller (distinct `:id/chat` paths).
 */
@Controller('memories')
export class MemoryChatController {
  constructor(@Inject(MemoryChatService) private readonly service: MemoryChatService) {}

  @Get(':id/chat')
  history(@Param('id') id: string): MemoryChatHistoryResponse {
    return { messages: this.service.getHistory(id) };
  }

  @Post(':id/chat')
  ask(@Param('id') id: string, @Body() body: unknown): Promise<PostMemoryChatResponse> {
    const parsed = PostMemoryChatRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.ask(id, parsed.data.message);
  }
}
