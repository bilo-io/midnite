import { Controller, Get, Header, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import type { DigestListResponse, DigestResponse } from '@midnite/shared';

import { DigestsService, DigestDoesNotExistError } from './digests.service';

/**
 * Read API for fleet digests (Phase 62 G). Thin: `GET /digests` (lean summaries
 * for the feed + dashboard widget), `GET /digests/:id` (the full digest for the
 * detail expand), and `GET /digests/:id/export` (the pre-rendered markdown).
 * Digests are fleet-wide (no team scope).
 */
@Controller('digests')
export class DigestsController {
  constructor(@Inject(DigestsService) private readonly service: DigestsService) {}

  @Get()
  list(@Query('limit') limit?: string): DigestListResponse {
    const n = limit ? Number(limit) : undefined;
    return { digests: this.service.listSummaries(Number.isFinite(n) ? n : undefined) };
  }

  @Get(':id')
  get(@Param('id') id: string): DigestResponse {
    try {
      return { digest: this.service.getById(id) };
    } catch (err) {
      if (err instanceof DigestDoesNotExistError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  @Get(':id/export')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  export(@Param('id') id: string): string {
    try {
      return this.service.exportMarkdown(id);
    } catch (err) {
      if (err instanceof DigestDoesNotExistError) throw new NotFoundException(err.message);
      throw err;
    }
  }
}
