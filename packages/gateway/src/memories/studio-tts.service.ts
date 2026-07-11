import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { ProviderCredentialsRepository } from '../agent/provider-credentials.repository';

/** One spoken turn: which host voice says what. */
export interface TtsTurn {
  voice: string;
  text: string;
}

/** The rendered audio + its container metadata. */
export interface TtsResult {
  audio: Buffer;
  mimeType: string;
  ext: string;
}

/**
 * A pluggable text-to-speech seam. Concrete providers render a sequence of voiced
 * turns to a single audio buffer. The OpenAI adapter is the only implementation
 * this phase; a Google/other adapter can slot in behind the same interface.
 */
export interface TtsProvider {
  synthesize(turns: TtsTurn[]): Promise<TtsResult>;
}

/**
 * Phase 65 E — the TTS seam for Memory Studio audio overviews. Reuses the existing
 * OpenAI provider *credential* (the LLM layer never calls TTS) selected by
 * `memory.studio.tts`. When no key is resolvable (or `provider: 'off'`) the seam
 * reports disabled and the Studio service ships the transcript only — never a hard
 * failure (Decision §1).
 */
@Injectable()
export class StudioTtsService {
  private readonly logger = new Logger(StudioTtsService.name);

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(ProviderCredentialsRepository)
    private readonly credentials: ProviderCredentialsRepository,
  ) {}

  /** The two host voices from config (A hosts, B explains). */
  get voices(): { a: string; b: string } {
    const { voiceA, voiceB } = this.config.memory.studio.tts;
    return { a: voiceA, b: voiceB };
  }

  /** Whether audio can actually be synthesised right now. */
  isEnabled(): boolean {
    return this.buildProvider() !== null;
  }

  /**
   * Synthesise the voiced turns to a single audio buffer, or return null when TTS
   * is unavailable (caller degrades to transcript-only). Per-turn synthesis with
   * the SDK, concatenated — OpenAI returns CBR MP3 frames that players stream fine
   * back-to-back, so no ffmpeg is needed for audio.
   */
  async synthesize(turns: TtsTurn[]): Promise<TtsResult | null> {
    const provider = this.buildProvider();
    if (!provider) return null;
    try {
      return await provider.synthesize(turns);
    } catch (err) {
      this.logger.warn(`TTS synthesis failed, degrading to transcript: ${String(err)}`);
      return null;
    }
  }

  private buildProvider(): TtsProvider | null {
    const cfg = this.config.memory.studio.tts;
    if (cfg.provider === 'off') return null;
    // Only OpenAI is wired this phase; `auto` and `openai` both resolve to it.
    const key = this.credentials.getProvider('openai')?.apiKey || process.env['OPENAI_API_KEY'];
    if (!key) return null;
    return new OpenAiTtsProvider(key, cfg.model);
  }
}

/** OpenAI `/v1/audio/speech` adapter (mp3, per-turn, concatenated). */
class OpenAiTtsProvider implements TtsProvider {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async synthesize(turns: TtsTurn[]): Promise<TtsResult> {
    const buffers: Buffer[] = [];
    for (const turn of turns) {
      const res = await this.client.audio.speech.create({
        model: this.model,
        voice: turn.voice,
        input: turn.text,
        response_format: 'mp3',
      });
      buffers.push(Buffer.from(await res.arrayBuffer()));
    }
    return { audio: Buffer.concat(buffers), mimeType: 'audio/mpeg', ext: 'mp3' };
  }
}
