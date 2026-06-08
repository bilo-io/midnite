import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentPingResponse, MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { resolveAnthropicCredential } from './anthropic-credentials';

const MODEL_ALIASES: Record<string, string> = {
  'opus4.8': 'claude-opus-4-8',
  'sonnet4.6': 'claude-sonnet-4-6',
  'haiku4.5': 'claude-haiku-4-5-20251001',
  // Legacy aliases from older configs — kept resolving. The 4.7 Sonnet id was
  // retired (404s), so it remaps to the current Sonnet.
  'opus4.7': 'claude-opus-4-7',
  'sonnet4.7': 'claude-sonnet-4-6',
};

const MISSING_CREDENTIAL_MESSAGE =
  'No ANTHROPIC_API_KEY env var and no Claude CLI credentials found — classifier will fall back to placeholder. Run `claude` to log in, or set ANTHROPIC_API_KEY.';

@Injectable()
export class AnthropicService implements OnModuleInit {
  private readonly logger = new Logger(AnthropicService.name);
  private client: Anthropic | undefined;
  enabled = false;

  constructor(@Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig) {}

  async onModuleInit(): Promise<void> {
    const cred = await resolveAnthropicCredential(this.logger);
    if (!cred) {
      this.logger.warn(MISSING_CREDENTIAL_MESSAGE);
      return;
    }

    this.client =
      cred.kind === 'apiKey'
        ? new Anthropic({ apiKey: cred.value })
        : new Anthropic({
            authToken: cred.value,
            defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
          });
    this.enabled = true;
    this.logger.log(
      `Anthropic credential resolved (kind=${cred.kind}, source=${cred.source}).`,
    );
  }

  resolveModel(alias: string): string {
    return MODEL_ALIASES[alias] ?? alias;
  }

  getClient(): Anthropic {
    if (!this.client) {
      throw new Error(MISSING_CREDENTIAL_MESSAGE);
    }
    return this.client;
  }

  getActModel(): string {
    return this.resolveModel(this.config.agent.act);
  }

  getPlanModel(): string {
    return this.resolveModel(this.config.agent.plan);
  }

  /** Lightweight health check: asks the model to report itself + status. Never throws. */
  async ping(): Promise<AgentPingResponse> {
    if (!this.enabled || !this.client) {
      return {
        ok: false,
        model: '',
        reply:
          'AI is disabled — no Anthropic credentials resolved. Run `claude` to log in or set ANTHROPIC_API_KEY.',
      };
    }
    const model = this.getActModel();
    try {
      const res = await this.client.messages.create({
        model,
        max_tokens: 120,
        system:
          "You are midnite's health check. Reply with ONE short line: your model name, then ' — system status: ok'.",
        messages: [{ role: 'user', content: 'ping' }],
      });
      const reply =
        res.content
          .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join(' ')
          .trim() || '(no text returned)';
      return { ok: true, model, reply };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, model, reply: `ping failed${status ? ` (${status})` : ''}: ${message}` };
    }
  }
}
