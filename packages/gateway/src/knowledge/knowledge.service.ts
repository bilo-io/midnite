import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MAX_GLOBAL_SOURCES, detectSourceKind, type GlobalSource } from '@midnite/shared';
import { fetchSourceMetadata } from '../projects/lib/opengraph';
import { KnowledgeRepository } from './knowledge.repository';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(@Inject(KnowledgeRepository) private readonly repo: KnowledgeRepository) {}

  listSources(): GlobalSource[] {
    return this.repo.listSources().map((s) => this.repo.toSource(s));
  }

  async addSource(url: string): Promise<GlobalSource[]> {
    if (this.repo.count() >= MAX_GLOBAL_SOURCES) {
      throw new BadRequestException(
        `the knowledge base can hold at most ${MAX_GLOBAL_SOURCES} sources`,
      );
    }
    // Best-effort metadata fetch — a private/unreachable link still gets stored,
    // just without a title/favicon (mirrors project sources).
    const now = new Date().toISOString();
    let title: string | null = null;
    let faviconUrl: string | null = null;
    try {
      const meta = await fetchSourceMetadata(url);
      title = meta.title ?? null;
      faviconUrl = meta.faviconUrl ?? null;
    } catch (err) {
      this.logger.warn(`failed to fetch metadata for ${url}: ${String(err)}`);
    }
    this.repo.insertSource({
      id: randomUUID(),
      url,
      kind: detectSourceKind(url),
      title,
      faviconUrl,
      fetchedAt: now,
      createdAt: now,
      position: this.repo.nextPosition(),
    });
    return this.listSources();
  }

  removeSource(id: string): GlobalSource[] {
    if (!this.repo.getSource(id)) throw new NotFoundException(`source ${id} not found`);
    this.repo.deleteSource(id);
    return this.listSources();
  }

  reorderSources(sourceIds: string[]): GlobalSource[] {
    const current = this.repo.listSources().map((s) => s.id);
    const same =
      current.length === sourceIds.length &&
      new Set(sourceIds).size === sourceIds.length &&
      sourceIds.every((id) => current.includes(id));
    if (!same) {
      throw new BadRequestException('reorder must list every current source exactly once');
    }
    this.repo.reorderSources(sourceIds);
    return this.listSources();
  }
}
