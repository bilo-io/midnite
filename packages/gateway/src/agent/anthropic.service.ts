import { Inject, Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';

const MODEL_ALIASES: Record<string, string> = {
  'opus4.7': 'claude-opus-4-7',
  'sonnet4.7': 'claude-sonnet-4-7',
  'haiku4.5': 'claude-haiku-4-5-20251001',
};

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: Anthropic | undefined;
  readonly enabled: boolean;

  constructor(@Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig) {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.enabled = true;
    } else {
      this.logger.warn(
        'ANTHROPIC_API_KEY not set — classifier will fall back to placeholder',
      );
      this.enabled = false;
    }
  }

  resolveModel(alias: string): string {
    return MODEL_ALIASES[alias] ?? alias;
  }

  getClient(): Anthropic {
    if (!this.client) {
      throw new Error('Anthropic client is not configured (missing ANTHROPIC_API_KEY)');
    }
    return this.client;
  }

  getActModel(): string {
    return this.resolveModel(this.config.agent.act);
  }
}
