import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  AUDIO_SCRIPT_JSON_SCHEMA,
  AudioScriptSchema,
  MEMORY_ARTIFACT_META,
  VIDEO_DECK_JSON_SCHEMA,
  VideoDeckSchema,
  type AudioScript,
  type MidniteConfig,
  type MemoryArtifact,
  type MemoryArtifactKind,
  type VideoDeck,
} from '@midnite/shared';
import { LlmService } from '../agent/llm/llm.service';
import { MIDNITE_CONFIG } from '../config.token';
import { resolveMediaPath } from '../media/lib/resolve-media-path';
import { MemoriesRepository } from './memories.repository';
import { MemoryArtifactsRepository } from './memory-artifacts.repository';
import { buildMemoryCorpus, corpusHasContent } from './lib/corpus';
import {
  extractSvg,
  stripMarkdownFence,
  studioPromptFor,
  type StudioTextKind,
} from './lib/studio-prompts';
import {
  AUDIO_SCRIPT_SYSTEM,
  VIDEO_DECK_SYSTEM,
  audioScriptUserText,
  deckNarration,
  renderAudioTranscript,
  renderVideoOutline,
  videoDeckUserText,
} from './lib/studio-media';
import { StudioTtsService, type TtsResult } from './studio-tts.service';
import { StudioVideoService } from './studio-video.service';

/** A generation outcome the service persists on the row. */
type GenOutcome = {
  content: string;
  filePath?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  degraded?: boolean;
};

/**
 * The Studio: generate artifacts from a memory's corpus using the shared, metered
 * {@link LlmService}. Text/SVG kinds (Phase 65 D) render inline; audio/video kinds
 * (Phase 65 E) are file-backed — an LLM writes the script/deck, then the TTS +
 * ffmpeg seams render real media, degrading to the script/outline when a provider
 * is missing. Generation is async: {@link generate} upserts a `pending` row (one
 * per kind — regenerate reuses it) and kicks a fire-and-forget run that flips the
 * row to `ready`/`failed`; the client polls {@link listArtifacts}. No new queue
 * infra (Decision §3).
 */
@Injectable()
export class MemoryStudioService {
  private readonly logger = new Logger(MemoryStudioService.name);

  constructor(
    @Inject(MemoriesRepository) private readonly memories: MemoriesRepository,
    @Inject(MemoryArtifactsRepository) private readonly artifacts: MemoryArtifactsRepository,
    @Inject(LlmService) private readonly llm: LlmService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(StudioTtsService) private readonly tts: StudioTtsService,
    @Inject(StudioVideoService) private readonly video: StudioVideoService,
  ) {}

  listArtifacts(memoryId: string): MemoryArtifact[] {
    this.assertMemory(memoryId);
    return this.artifacts.list(memoryId).map((r) => this.artifacts.hydrate(r));
  }

  /**
   * Start (or restart) generation of an artifact kind. Returns the `pending` row
   * immediately; the actual work runs in the background.
   */
  generate(memoryId: string, kind: MemoryArtifactKind): MemoryArtifact {
    this.assertMemory(memoryId);
    const meta = MEMORY_ARTIFACT_META[kind];
    const now = new Date().toISOString();
    const existing = this.artifacts.getByKind(memoryId, kind);

    let id: string;
    if (existing) {
      id = existing.id;
      this.artifacts.update(id, {
        status: 'pending',
        error: null,
        filePath: null,
        mimeType: null,
        fileSize: null,
        degraded: 0,
        updatedAt: now,
      });
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
        filePath: null,
        mimeType: null,
        fileSize: null,
        degraded: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    this.kickGeneration(memoryId, id, kind);
    return this.artifacts.hydrate(this.artifacts.get(memoryId, id)!);
  }

  deleteArtifact(memoryId: string, id: string): void {
    this.assertMemory(memoryId);
    const row = this.artifacts.get(memoryId, id);
    if (!row) throw new NotFoundException(`artifact ${id} not found`);
    if (row.filePath) void this.unlinkFile(row.filePath);
    this.artifacts.delete(memoryId, id);
  }

  /** File metadata for serving a file-backed artifact via `GET …/file`. */
  getArtifactFile(memoryId: string, id: string): { filePath: string; mimeType: string } {
    this.assertMemory(memoryId);
    const row = this.artifacts.get(memoryId, id);
    if (!row) throw new NotFoundException(`artifact ${id} not found`);
    if (!row.filePath) throw new NotFoundException(`artifact ${id} has no file`);
    return { filePath: row.filePath, mimeType: row.mimeType || 'application/octet-stream' };
  }

  /** Fire-and-forget wrapper so callers don't block on the generation round-trip. */
  private kickGeneration(memoryId: string, id: string, kind: MemoryArtifactKind): void {
    void this.runGeneration(memoryId, id, kind).catch((err) => {
      this.logger.warn(`artifact ${id} generation crashed: ${String(err)}`);
    });
  }

  /**
   * The awaitable generation body (unit-tested directly): build the corpus, run
   * the per-kind generator, and persist the result on the row. Never throws for a
   * "normal" failure — it records it on the row so the client can surface it.
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

    try {
      const outcome =
        kind === 'audio-overview'
          ? await this.generateAudio(id, corpus)
          : kind === 'video-overview'
            ? await this.generateVideo(id, corpus)
            : await this.generateTextArtifact(kind as StudioTextKind, corpus);

      if (!outcome.content.trim()) {
        return this.fail(id, 'The model returned an empty artifact. Try regenerating.');
      }
      this.artifacts.update(id, {
        content: outcome.content,
        status: 'ready',
        error: null,
        filePath: outcome.filePath ?? null,
        mimeType: outcome.mimeType ?? null,
        fileSize: outcome.fileSize ?? null,
        degraded: outcome.degraded ? 1 : 0,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn(`artifact ${id} (${kind}) generation failed: ${String(err)}`);
      this.fail(id, err instanceof Error ? err.message : 'Generation failed.');
    }
  }

  /** Text + infographic (Phase 65 D): one LLM call, inline markdown/SVG. */
  private async generateTextArtifact(kind: StudioTextKind, corpus: string): Promise<GenOutcome> {
    const { system, userText, maxTokens } = studioPromptFor(kind, corpus);
    const { text } = await this.llm.generateText(
      { model: this.llm.getActModel(), maxTokens, system, messages: [{ role: 'user', text: userText }] },
      'memory',
    );
    const content = MEMORY_ARTIFACT_META[kind].format === 'svg' ? extractSvg(text) : stripMarkdownFence(text);
    return { content };
  }

  /** Audio overview: two-host script → TTS mp3, or the transcript when TTS is off. */
  private async generateAudio(id: string, corpus: string): Promise<GenOutcome> {
    const script = await this.generateStructuredScript(corpus);
    const transcript = renderAudioTranscript(script);
    const voices = this.tts.voices;
    const turns = script.segments.map((s) => ({
      voice: s.speaker === 'A' ? voices.a : voices.b,
      text: s.text,
    }));
    const audio = await this.tts.synthesize(turns);
    if (!audio) return { content: transcript, degraded: true };
    const stored = await this.persistFile(id, audio.audio, audio.ext);
    return { content: transcript, filePath: stored, mimeType: audio.mimeType, fileSize: audio.audio.length };
  }

  /** Video overview: deck → narration TTS → ffmpeg compose, or the outline when a provider is missing. */
  private async generateVideo(id: string, corpus: string): Promise<GenOutcome> {
    const deck = await this.generateStructuredDeck(corpus);
    const outline = renderVideoOutline(deck);
    const narration = await this.narrateDeck(deck);
    const composed = narration ? await this.video.compose(deck, narration) : null;
    if (!composed) return { content: outline, degraded: true };
    const stored = await this.persistFile(id, composed.video, composed.ext);
    return {
      content: outline,
      filePath: stored,
      mimeType: composed.mimeType,
      fileSize: composed.video.length,
    };
  }

  private async generateStructuredScript(corpus: string): Promise<AudioScript> {
    const { data } = await this.llm.generateStructured(
      {
        model: this.llm.getActModel(),
        maxTokens: 2000,
        system: AUDIO_SCRIPT_SYSTEM,
        schema: AUDIO_SCRIPT_JSON_SCHEMA,
        schemaName: 'audio_overview',
        schemaDescription: 'A two-host podcast script grounded in the corpus.',
        messages: [{ role: 'user', text: audioScriptUserText(corpus) }],
      },
      'memory',
    );
    return AudioScriptSchema.parse(data);
  }

  private async generateStructuredDeck(corpus: string): Promise<VideoDeck> {
    const { data } = await this.llm.generateStructured(
      {
        model: this.llm.getActModel(),
        maxTokens: 2400,
        system: VIDEO_DECK_SYSTEM,
        schema: VIDEO_DECK_JSON_SCHEMA,
        schemaName: 'video_overview',
        schemaDescription: 'A narrated slideshow grounded in the corpus.',
        messages: [{ role: 'user', text: videoDeckUserText(corpus) }],
      },
      'memory',
    );
    return VideoDeckSchema.parse(data);
  }

  /** Narrate the whole deck with the host-A voice (single narrator for video). */
  private async narrateDeck(deck: VideoDeck): Promise<TtsResult | null> {
    return this.tts.synthesize([{ voice: this.tts.voices.a, text: deckNarration(deck) }]);
  }

  /**
   * Persist a rendered media buffer under the uploads dir and return its
   * uploads-relative path (what the serve endpoint re-confines). Reuses the media
   * path guard so the write can never escape the uploads root.
   */
  private async persistFile(id: string, data: Buffer, ext: string): Promise<string> {
    const rel = `memory-studio/${id}.${ext}`;
    const abs = resolveMediaPath(rel, this.config.gateway.uploadsDir);
    if (!abs) throw new Error('resolved artifact path escaped the uploads dir');
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, data);
    return rel;
  }

  private async unlinkFile(rel: string): Promise<void> {
    const abs = resolveMediaPath(rel, this.config.gateway.uploadsDir);
    if (abs) await rm(abs, { force: true }).catch(() => undefined);
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
