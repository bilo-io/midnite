import { BadRequestException, Controller, Get, Inject, InternalServerErrorException, Query } from '@nestjs/common';
import { NewsQuerySchema, type NewsResponse } from '@midnite/shared';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(@Inject(NewsService) private readonly service: NewsService) {}

  @Get()
  async getNews(@Query() query: unknown): Promise<NewsResponse> {
    const parsed = NewsQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return { stories: await this.service.topStories(parsed.data.count) };
    } catch (err) {
      throw new InternalServerErrorException(err instanceof Error ? err.message : 'news unavailable');
    }
  }
}
