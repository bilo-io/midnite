import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  MAX_SOURCES_PER_MEMORY,
  MAX_SOURCE_UPLOAD_BYTES,
  SOURCE_UPLOAD_MIME_TYPES,
  detectSourceKind,
  type CreateMemoryRequest,
  type Memory,
  type MemorySourceContent,
  type UpdateMemoryRequest,
} from '@midnite/shared';
import { fetchSourceMetadata } from '../projects/lib/opengraph';
import { memoryToIndexDoc } from '../search/lib/index-mappers';
import { SearchIndexService } from '../search/search-index.service';
import { MemoriesRepository } from './memories.repository';
import { MemoryIngestionService } from './memory-ingestion.service';

/** A file part accepted by the upload endpoint. */
export type MemoryFileUpload = { buffer: Buffer; fileName: string; mimeType: string };

/** One grounding source: a stable id (for citations), a human label, its text. */
export type MemoryCorpusSource = { id: string; label: string; text: string };
/** The grounding corpus for a memory: its own doc + its ready sources' text. */
export type MemoryCorpus = { id: string; title: string; content: string; sources: MemoryCorpusSource[] };

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);

  constructor(
    @Inject(MemoriesRepository) private readonly repo: MemoriesRepository,
    // Optional: see NotesService — global index in prod, omitted in unit specs.
    @Optional() @Inject(SearchIndexService) private readonly searchIndex?: SearchIndexService,
    // Optional: omitted in unit specs (ingestion is best-effort, async side-effect).
    @Optional() @Inject(MemoryIngestionService) private readonly ingestion?: MemoryIngestionService,
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

  /**
   * The server-side grounding corpus for a memory (Phase 65 C chat + later Studio):
   * its own title/content plus each **ready** source's extracted text (server-only,
   * never in the client `Memory` shape). Sources still pending/failed/un-ingested
   * contribute no text. Throws NotFound if the memory is gone.
   */
  getGroundingCorpus(id: string): MemoryCorpus {
    const memory = this.repo.getMemory(id);
    if (!memory) throw new NotFoundException(`memory ${id} not found`);
    const sources = this.repo
      .listSources(id)
      .filter((s) => s.ingestState === 'ready' && (s.extractedText ?? '').trim().length > 0)
      .map((s) => ({
        id: s.id,
        label: s.title?.trim() || s.fileName?.trim() || s.url || s.id,
        text: s.extractedText ?? '',
      }));
    return { id: memory.id, title: memory.title, content: memory.content, sources };
  }

  /**
   * A single source's extracted/scraped text plus its ingest status (Phase 65 B
   * stores the text server-side; the client `MemorySource` omits it). Powers the
   * source detail view's "Text" tab. Throws NotFound if the memory or source is gone.
   */
  getSourceContent(memoryId: string, sourceId: string): MemorySourceContent {
    this.assertExists(memoryId);
    const row = this.repo.getSource(memoryId, sourceId);
    if (!row) throw new NotFoundException(`source ${sourceId} not found`);
    return {
      id: row.id,
      ingestState: (row.ingestState as MemorySourceContent['ingestState']) ?? null,
      ingestError: row.ingestError ?? null,
      mimeType: row.mimeType ?? undefined,
      fileName: row.fileName ?? undefined,
      byteSize: row.byteSize ?? undefined,
      text: row.extractedText ?? null,
    };
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

    // Positions are assigned by staged order up front, so the parallel inserts
    // below preserve it (computing positions inside each would race to 0).
    const urls = dedupe(req.sources ?? []).slice(0, MAX_SOURCES_PER_MEMORY);
    const ids = await Promise.all(urls.map((url, i) => this.addSourceRow(id, url, i)));
    ids.forEach((sourceId, i) => {
      if (sourceId) this.kickIngestUrl(id, sourceId, urls[i]!);
    });

    this.reindex(id);
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
    this.reindex(id);
    return this.getMemory(id);
  }

  removeMemory(id: string): void {
    if (!this.repo.getMemory(id)) throw new NotFoundException(`memory ${id} not found`);
    this.repo.deleteMemory(id);
    this.searchIndex?.remove('memory', id);
  }

  async addSource(memoryId: string, url: string): Promise<Memory> {
    this.assertExists(memoryId);
    this.assertHasRoom(memoryId);
    const sourceId = await this.addSourceRow(memoryId, url, this.repo.nextSourcePosition(memoryId));
    if (sourceId) this.kickIngestUrl(memoryId, sourceId, url);
    return this.getMemory(memoryId);
  }

  /** Attach an uploaded file (PDF / markdown / text) as a source and ingest it. */
  async addFileSource(memoryId: string, file: MemoryFileUpload): Promise<Memory> {
    this.assertExists(memoryId);
    this.assertHasRoom(memoryId);
    if (file.buffer.length > MAX_SOURCE_UPLOAD_BYTES) {
      throw new BadRequestException(
        `file exceeds the ${Math.round(MAX_SOURCE_UPLOAD_BYTES / 1_000_000)}MB upload limit`,
      );
    }
    if (!(SOURCE_UPLOAD_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
      throw new BadRequestException(`unsupported file type: ${file.mimeType || 'unknown'}`);
    }
    if (!this.ingestion) {
      throw new BadRequestException('file uploads are unavailable');
    }
    const storagePath = await this.ingestion.storeUpload(file.fileName, file.buffer);
    const now = new Date().toISOString();
    const sourceId = randomUUID();
    this.repo.insertSource({
      id: sourceId,
      memoryId,
      url: null,
      kind: 'file',
      title: file.fileName,
      fileName: file.fileName,
      mimeType: file.mimeType,
      storagePath,
      byteSize: file.buffer.length,
      ingestState: 'pending',
      createdAt: now,
      position: this.repo.nextSourcePosition(memoryId),
    });
    this.kickIngestUpload(memoryId, sourceId, file.buffer, file.mimeType);
    return this.getMemory(memoryId);
  }

  /** Re-run ingestion for a source (a link re-fetch or a stored file re-extract). */
  reingestSource(memoryId: string, sourceId: string): Memory {
    this.assertExists(memoryId);
    const row = this.repo.getSource(memoryId, sourceId);
    if (!row) throw new NotFoundException(`source ${sourceId} not found`);
    if (row.url) {
      this.kickIngestUrl(memoryId, sourceId, row.url);
    } else if (row.storagePath && row.mimeType && this.ingestion) {
      const { storagePath, mimeType } = row;
      void this.ingestion
        .reingestFile(memoryId, sourceId, storagePath, mimeType)
        .then(() => this.reindex(memoryId))
        .catch(() => undefined);
    }
    return this.getMemory(memoryId);
  }

  /**
   * Lazily kick ingestion for any not-yet-ingested sources of a memory (Phase 65 B
   * rollout: existing link rows have no extracted text). Fire-and-forget.
   */
  backfillIngestion(memoryId: string): void {
    if (!this.ingestion) return;
    for (const row of this.repo.listSources(memoryId)) {
      if (row.ingestState != null) continue; // already pending/ready/failed
      if (row.url) this.kickIngestUrl(memoryId, row.id, row.url);
      else if (row.storagePath && row.mimeType) {
        const { storagePath, mimeType } = row;
        void this.ingestion
          .reingestFile(memoryId, row.id, storagePath, mimeType)
          .then(() => this.reindex(memoryId))
          .catch(() => undefined);
      }
    }
  }

  removeSource(memoryId: string, sourceId: string): Memory {
    this.assertExists(memoryId);
    if (!this.repo.getSource(memoryId, sourceId)) {
      throw new NotFoundException(`source ${sourceId} not found`);
    }
    this.repo.deleteSource(memoryId, sourceId);
    this.reindex(memoryId);
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

  private assertHasRoom(memoryId: string): void {
    if (this.repo.countSources(memoryId) >= MAX_SOURCES_PER_MEMORY) {
      throw new BadRequestException(`a memory can have at most ${MAX_SOURCES_PER_MEMORY} sources`);
    }
  }

  /** Fire-and-forget URL ingest, re-indexing once the text lands (or fails). */
  private kickIngestUrl(memoryId: string, sourceId: string, url: string): void {
    void this.ingestion
      ?.ingestUrl(memoryId, sourceId, url)
      .then(() => this.reindex(memoryId))
      .catch(() => undefined);
  }

  private kickIngestUpload(
    memoryId: string,
    sourceId: string,
    buffer: Buffer,
    mimeType: string,
  ): void {
    void this.ingestion
      ?.ingestUpload(memoryId, sourceId, buffer, mimeType)
      .then(() => this.reindex(memoryId))
      .catch(() => undefined);
  }

  /** Rebuild the memory's FTS row, folding in its sources' extracted text. */
  private reindex(memoryId: string): void {
    if (!this.searchIndex) return;
    const row = this.repo.getMemory(memoryId);
    if (!row) return;
    const memory = this.repo.hydrate(row);
    const sourceTexts = this.repo
      .listSources(memoryId)
      .map((s) => s.extractedText)
      .filter((t): t is string => Boolean(t && t.trim()));
    this.searchIndex.upsert(memoryToIndexDoc(memory, sourceTexts));
  }

  private async addSourceRow(
    memoryId: string,
    url: string,
    position: number,
  ): Promise<string | null> {
    try {
      const now = new Date().toISOString();
      const meta = await fetchSourceMetadata(url);
      const id = randomUUID();
      this.repo.insertSource({
        id,
        memoryId,
        url,
        kind: detectSourceKind(url),
        title: meta.title ?? null,
        faviconUrl: meta.faviconUrl ?? null,
        fetchedAt: now,
        createdAt: now,
        position,
      });
      return id;
    } catch (err) {
      // Best-effort: a bad fetch or insert must not fail memory creation.
      this.logger.warn(`failed to add source ${url}: ${String(err)}`);
      return null;
    }
  }
}

function dedupe(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
}
