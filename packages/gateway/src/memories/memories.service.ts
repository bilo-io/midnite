import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  MAX_SOURCES_PER_MEMORY,
  detectSourceKind,
  type CreateMemoryRequest,
  type Memory,
  type UpdateMemoryRequest,
} from '@midnite/shared';
import { fetchSourceMetadata } from '../projects/lib/opengraph';
import { SearchIndexService } from '../search/search-index.service';
import { MemoriesRepository } from './memories.repository';

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);

  constructor(
    @Inject(MemoriesRepository) private readonly repo: MemoriesRepository,
    @Inject(SearchIndexService) private readonly searchIndex: SearchIndexService,
  ) {}

  listMemories(): Memory[] {
    return this.repo.listMemories().map((r) => this.repo.hydrate(r));
  }

  /** Memories that apply to a project (its own + global), hydrated with sources. */
  listScoped(projectId: string): Memory[] {
    return this.repo.listScoped(projectId).map((r) => this.repo.hydrate(r));
  }

  getMemory(id: string): Memory {
    const row = this.repo.getMemory(id);
    if (!row) throw new NotFoundException(`memory ${id} not found`);
    return this.repo.hydrate(row);
  }

  async createMemory(req: CreateMemoryRequest): Promise<Memory> {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.repo.insertMemory({
      id,
      title: req.title,
      content: req.content,
      projectId: req.projectId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    this.searchIndex.upsert('memory', id, req.title, req.content);

    // Positions are assigned by staged order up front, so the parallel inserts
    // below preserve it (computing positions inside each would race to 0).
    const urls = dedupe(req.sources ?? []).slice(0, MAX_SOURCES_PER_MEMORY);
    await Promise.all(urls.map((url, i) => this.addSourceRow(id, url, i)));

    return this.getMemory(id);
  }

  updateMemory(id: string, req: UpdateMemoryRequest): Memory {
    if (!this.repo.getMemory(id)) throw new NotFoundException(`memory ${id} not found`);
    this.repo.updateMemory(id, {
      ...(req.title !== undefined ? { title: req.title } : {}),
      ...(req.content !== undefined ? { content: req.content } : {}),
      ...(req.projectId !== undefined ? { projectId: req.projectId } : {}),
      ...(req.archived !== undefined
        ? { archivedAt: req.archived ? new Date().toISOString() : null }
        : {}),
      updatedAt: new Date().toISOString(),
    });
    const memory = this.getMemory(id);
    // Re-index from the current row so an edited title/content stays findable.
    this.searchIndex.upsert('memory', id, memory.title, memory.content);
    return memory;
  }

  removeMemory(id: string): void {
    if (!this.repo.getMemory(id)) throw new NotFoundException(`memory ${id} not found`);
    this.repo.deleteMemory(id);
    this.searchIndex.remove('memory', id);
  }

  async addSource(memoryId: string, url: string): Promise<Memory> {
    this.assertExists(memoryId);
    if (this.repo.countSources(memoryId) >= MAX_SOURCES_PER_MEMORY) {
      throw new BadRequestException(
        `a memory can have at most ${MAX_SOURCES_PER_MEMORY} sources`,
      );
    }
    await this.addSourceRow(memoryId, url, this.repo.nextSourcePosition(memoryId));
    return this.getMemory(memoryId);
  }

  removeSource(memoryId: string, sourceId: string): Memory {
    this.assertExists(memoryId);
    if (!this.repo.getSource(memoryId, sourceId)) {
      throw new NotFoundException(`source ${sourceId} not found`);
    }
    this.repo.deleteSource(memoryId, sourceId);
    return this.getMemory(memoryId);
  }

  reorderSources(memoryId: string, sourceIds: string[]): Memory {
    this.assertExists(memoryId);
    const current = this.repo.listSources(memoryId).map((s) => s.id);
    const same =
      current.length === sourceIds.length &&
      new Set(sourceIds).size === sourceIds.length &&
      sourceIds.every((id) => current.includes(id));
    if (!same) {
      throw new BadRequestException('reorder must list every current source exactly once');
    }
    this.repo.reorderSources(memoryId, sourceIds);
    return this.getMemory(memoryId);
  }

  private assertExists(id: string): void {
    if (!this.repo.getMemory(id)) throw new NotFoundException(`memory ${id} not found`);
  }

  private async addSourceRow(memoryId: string, url: string, position: number): Promise<void> {
    try {
      const now = new Date().toISOString();
      const meta = await fetchSourceMetadata(url);
      this.repo.insertSource({
        id: randomUUID(),
        memoryId,
        url,
        kind: detectSourceKind(url),
        title: meta.title ?? null,
        faviconUrl: meta.faviconUrl ?? null,
        fetchedAt: now,
        createdAt: now,
        position,
      });
    } catch (err) {
      // Best-effort: a bad fetch or insert must not fail memory creation.
      this.logger.warn(`failed to add source ${url}: ${String(err)}`);
    }
  }
}

function dedupe(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
}
