import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, resolve } from 'node:path';
import { MAX_SOURCE_TEXT_BYTES, type MidniteConfig } from '@midnite/shared';
import { isSafeHttpUrl, readCapped } from '../projects/lib/opengraph';
import { resolveMediaPath } from '../media/lib/resolve-media-path';
import { MIDNITE_CONFIG } from '../config.token';
import { MemoriesRepository } from './memories.repository';
import { capUtf8, extractUpload, htmlToPlainText } from './lib/ingest';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_FETCH_BYTES = 2 * 1024 * 1024; // cap the raw download before extraction
const USER_AGENT =
  'Mozilla/5.0 (compatible; midnite-source-ingest/1.0; +https://github.com/bilo-io/midnite)';

/** Where uploaded source files live under the (reused) media uploads store. */
const UPLOAD_SUBDIR = 'memory-sources';

/**
 * Ingests a memory source's readable text (Phase 65 B) — the grounding corpus
 * chat + Studio stand on. Runs **async + best-effort**: it flips the source to
 * `pending`, extracts, then writes `ready` (with text) or `failed` (with a
 * message). It never throws to its caller, so a bad fetch never breaks add/upload.
 */
@Injectable()
export class MemoryIngestionService {
  private readonly logger = new Logger(MemoryIngestionService.name);

  constructor(
    @Inject(MemoriesRepository) private readonly repo: MemoriesRepository,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {}

  private uploadsDir(): string {
    const p = this.config.gateway.uploadsDir;
    return isAbsolute(p) ? p : resolve(process.cwd(), p);
  }

  /** Persist an uploaded file under the uploads store; returns its relative path. */
  async storeUpload(originalName: string, buf: Buffer): Promise<string> {
    const dir = join(this.uploadsDir(), UPLOAD_SUBDIR);
    await mkdir(dir, { recursive: true });
    const ext = extname(originalName).slice(0, 12); // keep a sane, short extension
    const rel = `${UPLOAD_SUBDIR}/${randomUUID()}${ext}`;
    await writeFile(resolve(this.uploadsDir(), rel), buf);
    return rel;
  }

  /** Fetch + extract a URL source's body, writing ready/failed on the row. */
  async ingestUrl(memoryId: string, sourceId: string, url: string): Promise<void> {
    this.repo.updateSource(memoryId, sourceId, { ingestState: 'pending', ingestError: null });
    try {
      if (!isSafeHttpUrl(url)) throw new Error('unsafe or private URL');
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: 'follow',
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain,*/*' },
      });
      if (!res.ok) throw new Error(`fetch failed (${res.status})`);
      const body = await readCapped(res, MAX_FETCH_BYTES);
      const contentType = res.headers.get('content-type') ?? '';
      const text = contentType.includes('html') ? htmlToPlainText(body) : body.trim();
      this.markReady(memoryId, sourceId, text);
    } catch (err) {
      this.markFailed(memoryId, sourceId, err);
    }
  }

  /** Extract an uploaded file's text (by mime), writing ready/failed on the row. */
  async ingestUpload(
    memoryId: string,
    sourceId: string,
    buf: Buffer,
    mimeType: string,
  ): Promise<void> {
    this.repo.updateSource(memoryId, sourceId, { ingestState: 'pending', ingestError: null });
    try {
      const text = await extractUpload(buf, mimeType);
      if (text === null) throw new Error(`unsupported file type: ${mimeType}`);
      this.markReady(memoryId, sourceId, text);
    } catch (err) {
      this.markFailed(memoryId, sourceId, err);
    }
  }

  /** Re-run ingestion for a stored file source from its persisted bytes. */
  async reingestFile(
    memoryId: string,
    sourceId: string,
    storagePath: string,
    mimeType: string,
  ): Promise<void> {
    const abs = resolveMediaPath(storagePath, this.uploadsDir());
    if (!abs) {
      this.markFailed(memoryId, sourceId, new Error('stored file path is invalid'));
      return;
    }
    try {
      const buf = await readFile(abs);
      await this.ingestUpload(memoryId, sourceId, buf, mimeType);
    } catch (err) {
      this.markFailed(memoryId, sourceId, err);
    }
  }

  private markReady(memoryId: string, sourceId: string, text: string): void {
    const capped = capUtf8(text, MAX_SOURCE_TEXT_BYTES);
    this.repo.updateSource(memoryId, sourceId, {
      extractedText: capped,
      byteSize: Buffer.byteLength(capped, 'utf-8'),
      ingestState: 'ready',
      ingestError: null,
    });
  }

  private markFailed(memoryId: string, sourceId: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.warn(`ingest failed for source ${sourceId}: ${message}`);
    this.repo.updateSource(memoryId, sourceId, { ingestState: 'failed', ingestError: message });
  }
}
