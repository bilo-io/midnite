import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  MEMORY_ARTIFACT_META,
  type MemoryArtifact,
  type MemoryArtifactKind,
} from '@midnite/shared';
import { LlmService } from '../agent/llm/llm.service';
import { MemoriesRepository } from './memories.repository';
import { MemoryArtifactsRepository } from './memory-artifacts.repository';
import { buildMemoryCorpus, corpusHasContent } from './lib/corpus';
import { extractSvg, stripMarkdownFence, studioPromptFor } from './lib/studio-prompts';

/**
 * Phase 65 D — the Studio: generate artifacts (brief / FAQ / study-guide /
 * timeline / infographic) from a memory's corpus using the shared, metered
 * {@link LlmService}. Generation is async: {@link generate} upserts a `pending`
 * row (one per kind — regenerate reuses it) and kicks a fire-and-forget run that
 * flips the row to `ready`/`failed`; the client polls {@link listArtifacts}. No
 * new queue infra (Decision §3).
 */
@Injectable()
export class MemoryStudioService {
  private readonly logger = new Logger(MemoryStudioService.name);

  constructor(
    @Inject(MemoriesRepository) private readonly memories: MemoriesRepository,
    @Inject(MemoryArtifactsRepository) private readonly artifacts: MemoryArtifactsRepository,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  listArtifacts(memoryId: string): MemoryArtifact[] {
    this.assertMemory(memoryId);
    return this.artifacts.list(memoryId).map((r) => this.artifacts.hydrate(r));
  }

  /**
   * Start (or restart) generation of an artifact kind. Returns the `pending` row
   * immediately; the actual LLM work runs in the background.
   */
  generate(memoryId: string, kind: MemoryArtifactKind): MemoryArtifact {
    this.assertMemory(memoryId);
    const meta = MEMORY_ARTIFACT_META[kind];
    const now = new Date().toISOString();
    const existing = this.artifacts.getByKind(memoryId, kind);

    let id: string;
    if (existing) {
      id = existing.id;
      this.artifacts.update(id, { status: 'pending', error: null, updatedAt: now });
    } else {
      id = randomUUID();
      this.artifacts.insert({
        id,
        memoryId,
        kind,
        format: meta.format,
        title: meta.label,
        content: '',
        status: 'pending',
        error: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    this.kickGeneration(memoryId, id, kind);
    return this.artifacts.hydrate(this.artifacts.get(memoryId, id)!);
  }

  deleteArtifact(memoryId: string, id: string): void {
    this.assertMemory(memoryId);
    if (!this.artifacts.get(memoryId, id)) {
      throw new NotFoundException(`artifact ${id} not found`);
    }
    this.artifacts.delete(memoryId, id);
  }

  /** Fire-and-forget wrapper so callers don't block on the LLM round-trip. */
  private kickGeneration(memoryId: string, id: string, kind: MemoryArtifactKind): void {
    void this.runGeneration(memoryId, id, kind).catch((err) => {
      this.logger.warn(`artifact ${id} generation crashed: ${String(err)}`);
    });
  }

  /**
   * The awaitable generation body (unit-tested directly): build the corpus, call
   * the LLM, and persist the result on the row. Never throws for a "normal"
   * failure — it records the failure on the row so the client can surface it.
   */
  async runGeneration(memoryId: string, id: string, kind: MemoryArtifactKind): Promise<void> {
    const memoryRow = this.memories.getMemory(memoryId);
    if (!memoryRow) return; // memory deleted mid-flight
    const memory = this.memories.hydrate(memoryRow);
    const sourceRows = this.memories.listSources(memoryId);

    if (!this.llm.enabled) {
      return this.fail(id, 'No AI provider is configured. Add one in Settings to generate artifacts.');
    }
    if (!corpusHasContent(memory, sourceRows)) {
      return this.fail(id, 'This memory has no content or ingested sources to generate from yet.');
    }

    const corpus = buildMemoryCorpus(memory, sourceRows);
    const { system, userText, maxTokens } = studioPromptFor(kind, corpus);

    try {
      const { text } = await this.llm.generateText(
        { model: this.llm.getActModel(), maxTokens, system, messages: [{ role: 'user', text: userText }] },
        'memory',
      );
      const content = MEMORY_ARTIFACT_META[kind].format === 'svg' ? extractSvg(text) : stripMarkdownFence(text);
      if (!content.trim()) {
        return this.fail(id, 'The model returned an empty artifact. Try regenerating.');
      }
      this.artifacts.update(id, {
        content,
        status: 'ready',
        error: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn(`artifact ${id} (${kind}) generation failed: ${String(err)}`);
      this.fail(id, err instanceof Error ? err.message : 'Generation failed.');
    }
  }

  private fail(id: string, message: string): void {
    this.artifacts.update(id, {
      status: 'failed',
      error: message,
      updatedAt: new Date().toISOString(),
    });
  }

  private assertMemory(memoryId: string): void {
    if (!this.memories.getMemory(memoryId)) {
      throw new NotFoundException(`memory ${memoryId} not found`);
    }
  }
}
