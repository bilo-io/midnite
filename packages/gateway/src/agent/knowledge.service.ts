import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MidniteConfig, Task } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { KnowledgeWatcherService } from './knowledge-watcher.service';
import { LlmService } from './llm/llm.service';
import {
  MAX_KNOWLEDGE_FILES,
  buildKnowledgeBlock,
  renderManifest,
  validateSelection,
  type KnowledgeManifestEntry,
} from './lib/knowledge';

const SELECT_SYSTEM_PROMPT =
  "You are midnite's planner. Given a coding task and a list of available " +
  'knowledge files (filename + section headings), pick the files whose content ' +
  'would genuinely help an agent carry out the task — project conventions, ' +
  'domain notes, runbooks. Return the exact filenames from the list, copied ' +
  'verbatim. Pick none (an empty list) if nothing is clearly relevant; never guess.';

/**
 * Phase 15 Theme D — fold relevant "knowledge files" into a task's execution
 * prompt. Asks the plan model which watched files (by manifest) apply, reads
 * their content, and appends a capped block. Best-effort + fail-open, like
 * {@link UrlContextService}: AI off, an empty folder, or any error leaves the
 * prompt untouched, never blocking the agent run.
 */
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(KnowledgeWatcherService) private readonly watcher: KnowledgeWatcherService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  /** Return `prompt` with a "Knowledge files" block appended, or unchanged. */
  async enrich(prompt: string, task: Task): Promise<string> {
    if (!this.config.knowledge.enabled || !this.llm.enabled) return prompt;
    const manifest = this.watcher.getManifest();
    if (manifest.length === 0) return prompt;
    try {
      const taskText = `${task.title}\n\n${task.prompt?.trim() ?? ''}`.trim();
      const selected = await this.select(taskText, manifest);
      if (selected.length === 0) return prompt;

      const files = await this.watcher.readFiles(selected);
      const block = buildKnowledgeBlock(files, this.config.knowledge.maxBytes);
      if (!block) return prompt;

      this.logger.log(`injected ${files.length} knowledge file(s): ${selected.join(', ')}`);
      return prompt + block;
    } catch (err) {
      this.logger.warn(
        `knowledge enrich failed (${err instanceof Error ? err.message : 'unknown'}); skipping`,
      );
      return prompt;
    }
  }

  /** Ask the plan model which manifest files apply; validate against the manifest. */
  private async select(taskText: string, manifest: KnowledgeManifestEntry[]): Promise<string[]> {
    const names = manifest.map((e) => e.file);
    const { data } = await this.llm.generateStructured(
      {
        model: this.llm.getPlanModel(),
        maxTokens: 256,
        system: SELECT_SYSTEM_PROMPT,
        schema: {
          type: 'object' as const,
          properties: {
            files: {
              type: 'array',
              items: { type: 'string', enum: names },
              description: 'Filenames from the list relevant to the task; empty if none.',
            },
          },
          required: ['files'],
        },
        schemaName: 'knowledge_select',
        schemaDescription: 'Record which knowledge files are relevant to the task.',
        messages: [
          {
            role: 'user',
            text: `Knowledge files:\n${renderManifest(manifest)}\n\nTask:\n${taskText}`,
          },
        ],
      },
      'planner',
    );
    const files =
      typeof data === 'object' && data !== null && 'files' in data
        ? (data as { files: unknown }).files
        : undefined;
    return validateSelection(files, new Set(names), MAX_KNOWLEDGE_FILES);
  }
}
