import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { watch, type FSWatcher } from 'chokidar';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { expandTilde } from '../fs/path-tilde';
import { extractHeadings, type KnowledgeFile, type KnowledgeManifestEntry } from './lib/knowledge';

/**
 * Phase 15 Theme D — watches `config.knowledge.dir` for Markdown and keeps an
 * in-memory manifest (filename + headings) fresh on add/change/unlink. The files
 * on disk are the source of truth (no DB); content is read on demand at injection
 * time, not cached. {@link KnowledgeService} owns the model selection + prompt
 * folding; this service is just the index.
 */
@Injectable()
export class KnowledgeWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeWatcherService.name);
  private readonly manifest = new Map<string, KnowledgeManifestEntry>();
  private watcher?: FSWatcher;
  private rootDir?: string;

  /** Resolves once the initial directory scan has completed (immediately if off). */
  readonly ready: Promise<void>;
  private markReady: () => void = () => {};

  constructor(@Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig) {
    this.ready = new Promise<void>((res) => {
      this.markReady = res;
    });
  }

  onModuleInit(): void {
    const { enabled, dir } = this.config.knowledge;
    if (!enabled || !dir) {
      this.markReady();
      return;
    }
    this.rootDir = resolve(expandTilde(dir));
    this.watcher = watch(join(this.rootDir, '**/*.md'), {
      ignoreInitial: false,
      // Let a save settle before re-reading, so we don't index a half-written file.
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    });
    this.watcher
      .on('add', (p) => void this.index(p))
      .on('change', (p) => void this.index(p))
      .on('unlink', (p) => this.drop(p))
      .on('ready', () => {
        this.logger.log(`watching ${this.manifest.size} knowledge file(s) in ${this.rootDir}`);
        this.markReady();
      })
      .on('error', (err) => this.logger.warn(`knowledge watcher error: ${String(err)}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.watcher?.close();
  }

  /** The current manifest, sorted by filename for stable ordering. */
  getManifest(): KnowledgeManifestEntry[] {
    return [...this.manifest.values()].sort((a, b) => a.file.localeCompare(b.file));
  }

  /** Read the content of selected files (by manifest key), guarded to the root. */
  async readFiles(files: string[]): Promise<KnowledgeFile[]> {
    if (!this.rootDir) return [];
    const reads = await Promise.all(
      files.map(async (file) => {
        const abs = this.safeResolve(file);
        if (!abs) return null;
        try {
          return { file, content: await readFile(abs, 'utf8') } satisfies KnowledgeFile;
        } catch {
          return null; // vanished/unreadable since selection — skip
        }
      }),
    );
    return reads.filter((r): r is KnowledgeFile => r !== null);
  }

  private async index(absPath: string): Promise<void> {
    const key = this.toKey(absPath);
    if (!key) return;
    try {
      const content = await readFile(absPath, 'utf8');
      this.manifest.set(key, { file: key, headings: extractHeadings(content) });
    } catch {
      this.manifest.delete(key); // unreadable — drop it
    }
  }

  private drop(absPath: string): void {
    const key = this.toKey(absPath);
    if (key) this.manifest.delete(key);
  }

  /** Absolute path → posix-style key relative to the root, or undefined if outside. */
  private toKey(absPath: string): string | undefined {
    if (!this.rootDir) return undefined;
    const rel = relative(this.rootDir, absPath);
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) return undefined;
    return rel.split(sep).join('/');
  }

  /** Manifest key → absolute path, refusing anything that escapes the root. */
  private safeResolve(key: string): string | undefined {
    if (!this.rootDir) return undefined;
    const abs = resolve(this.rootDir, key);
    const rel = relative(this.rootDir, abs);
    return !rel.startsWith('..') && !isAbsolute(rel) ? abs : undefined;
  }
}
