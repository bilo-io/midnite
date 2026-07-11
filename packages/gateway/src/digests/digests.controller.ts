import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  isServerRenderedReportFormat,
  ReportFormatSchema,
  type DigestListResponse,
  type DigestResponse,
} from '@midnite/shared';

import { sendMarkdownReport } from '../lib/report-response';
import { DigestsService } from './digests.service';

/**
 * Phase 62 G — read fleet digests. Thin: list recent digests for the feed, fetch
 * one for the detail render, or download its pre-rendered markdown. Digests are a
 * global reporting artifact (no team column — Decision §5), so there is no
 * per-caller scope filter, matching the other global read surfaces.
 */
@Controller('digests')
export class DigestsController {
  constructor(@Inject(DigestsService) private readonly digests: DigestsService) {}

  @Get()
  list(@Query('limit') limit?: string): DigestListResponse {
    const parsed = limit === undefined ? undefined : Number.parseInt(limit, 10);
    const n = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
    return { digests: this.digests.list(n) };
  }

  @Get(':id')
  get(@Param('id') id: string): DigestResponse {
    const digest = this.digests.get(id);
    if (!digest) throw new NotFoundException(`no digest ${id}`);
    return { digest };
  }

  // Export the digest as portable markdown. `pdf` is rendered client-side from
  // this markdown (print-to-PDF), so only `md` is served here — matching the
  // task/council/retro export routes.
  @Get(':id/export')
  export(
    @Param('id') id: string,
    @Res({ passthrough: false }) reply: FastifyReply,
    @Query('format') format?: string,
  ): void {
    const parsed = ReportFormatSchema.safeParse(format ?? 'md');
    if (!parsed.success) {
      throw new BadRequestException(`unsupported export format: ${String(format)}`);
    }
    if (!isServerRenderedReportFormat(parsed.data)) {
      throw new BadRequestException(
        `${parsed.data} is rendered client-side (print-to-PDF); request format=md`,
      );
    }
    const markdown = this.digests.getMarkdown(id);
    if (markdown === undefined) throw new NotFoundException(`no digest ${id}`);
    sendMarkdownReport(reply, `digest-${id}.md`, markdown);
  }
}
