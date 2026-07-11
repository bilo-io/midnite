import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import type { FastifyReply } from 'fastify';
import {
  GenerateMemoryArtifactRequestSchema,
  type MidniteConfig,
  type MemoryArtifactResponse,
  type MemoryArtifactsResponse,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { resolveMediaPath } from '../media/lib/resolve-media-path';
import { MemoryStudioService } from './memory-studio.service';

/**
 * Phase 65 D/E — Studio artifact endpoints, scoped under a memory. Thin: parse +
 * delegate to {@link MemoryStudioService}. Generation is async, so POST returns
 * the `pending` artifact and the client polls `GET …/artifacts`. File-backed
 * artifacts (audio/video, Theme E) stream their rendered media from `…/file`.
 */
@Controller('memories/:id/artifacts')
export class MemoryStudioController {
  constructor(
    @Inject(MemoryStudioService) private readonly service: MemoryStudioService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {}

  @Get()
  list(@Param('id') id: string): MemoryArtifactsResponse {
    return { artifacts: this.service.listArtifacts(id) };
  }

  @Post()
  generate(@Param('id') id: string, @Body() body: unknown): MemoryArtifactResponse {
    const parsed = GenerateMemoryArtifactRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { artifact: this.service.generate(id, parsed.data.kind) };
  }

  @Get(':artifactId/file')
  serveFile(
    @Param('id') id: string,
    @Param('artifactId') artifactId: string,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): void {
    const { filePath, mimeType } = this.service.getArtifactFile(id, artifactId);

    // Re-confine the stored path to the uploads dir before streaming — the write
    // path can't escape it, but a legacy/imported row must not read arbitrary
    // files off disk (mirrors the media file-serve guard, Phase 60 C).
    const absolutePath = resolveMediaPath(filePath, this.config.gateway.uploadsDir);
    if (!absolutePath) throw new BadRequestException('invalid artifact path');
    if (!existsSync(absolutePath)) throw new NotFoundException('file not found on disk');

    const stream = createReadStream(absolutePath);
    void reply.header('content-type', mimeType || 'application/octet-stream').send(stream);
  }

  @Delete(':artifactId')
  remove(@Param('id') id: string, @Param('artifactId') artifactId: string): { ok: true } {
    this.service.deleteArtifact(id, artifactId);
    return { ok: true };
  }
}
