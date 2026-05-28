import { Inject, Injectable, Logger } from '@nestjs/common';
import { isAbsolute, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import type Anthropic from '@anthropic-ai/sdk';
import {
  ClassifiedTaskSchema,
  TASK_KINDS,
  type ClassifiedTask,
  type MidniteConfig,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { AnthropicService } from './anthropic.service';
import { TASK_TRIAGE_SYSTEM_PROMPT } from './prompts';

export interface ClassifierImage {
  path: string;
  mime: string;
}

export abstract class TaskClassifier {
  abstract classify(
    prompt: string,
    images: ClassifierImage[],
  ): Promise<ClassifiedTask>;
}

@Injectable()
export class PlaceholderClassifier extends TaskClassifier {
  async classify(prompt: string, _images: ClassifierImage[] = []): Promise<ClassifiedTask> {
    const firstLine = prompt.split('\n')[0] ?? prompt;
    const title = firstLine.slice(0, 80).trim() || 'Untitled task';
    return { title, kind: 'unknown' };
  }
}

const RECORD_TASK_TOOL = {
  name: 'record_task',
  description:
    'Record the classified task title and kind for the submitted prompt.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        maxLength: 120,
        description: 'Short imperative task title.',
      },
      kind: {
        type: 'string',
        enum: TASK_KINDS as unknown as string[],
        description: 'Best-fit kind from the allowed enum.',
      },
    },
    required: ['title', 'kind'],
  },
};

const IMAGE_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

@Injectable()
export class AnthropicClassifier extends TaskClassifier {
  private readonly logger = new Logger(AnthropicClassifier.name);

  constructor(
    @Inject(AnthropicService) private readonly anthropic: AnthropicService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {
    super();
  }

  async classify(
    prompt: string,
    images: ClassifierImage[],
  ): Promise<ClassifiedTask> {
    if (!this.anthropic.enabled) {
      return new PlaceholderClassifier().classify(prompt, images);
    }

    const client = this.anthropic.getClient();
    const uploadsRoot = this.resolveUploadsDir();

    const imageBlocks = images
      .filter((img) => IMAGE_MEDIA_TYPES.has(img.mime))
      .map((img) => {
        const abs = isAbsolute(img.path) ? img.path : join(uploadsRoot, img.path);
        const data = readFileSync(abs).toString('base64');
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: img.mime as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
            data,
          },
        };
      });

    const response = await client.messages.create({
      model: this.anthropic.getActModel(),
      max_tokens: 256,
      system: [
        {
          type: 'text',
          text: TASK_TRIAGE_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [RECORD_TASK_TOOL],
      tool_choice: { type: 'tool', name: 'record_task' },
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            { type: 'text' as const, text: prompt },
          ],
        },
      ],
    });

    const usage = response.usage as Anthropic.Messages.Usage & {
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
    this.logger.debug?.(
      `classify usage in=${usage.input_tokens} out=${usage.output_tokens} cache_read=${usage.cache_read_input_tokens ?? 0} cache_create=${usage.cache_creation_input_tokens ?? 0}`,
    );

    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === 'tool_use' && block.name === 'record_task',
    );
    if (!toolUse) {
      throw new Error('classifier did not return a record_task tool call');
    }

    const parsed = ClassifiedTaskSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      throw new Error(
        `classifier tool input failed validation: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  private resolveUploadsDir(): string {
    const p = this.config.gateway.uploadsDir;
    return isAbsolute(p) ? p : resolve(process.cwd(), p);
  }
}
