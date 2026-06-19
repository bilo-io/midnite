import { Inject, Injectable, Logger } from '@nestjs/common';
import { isAbsolute, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  ClassifiedTaskSchema,
  TASK_KINDS,
  type ClassifiedTask,
  type MidniteConfig,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { LlmService } from './llm/llm.service';
import type { LlmImagePart } from './llm/llm-provider.interface';
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

const RECORD_TASK_SCHEMA = {
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
};

const IMAGE_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

@Injectable()
export class LlmClassifier extends TaskClassifier {
  private readonly logger = new Logger(LlmClassifier.name);

  constructor(
    @Inject(LlmService) private readonly llm: LlmService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {
    super();
  }

  async classify(
    prompt: string,
    images: ClassifierImage[],
  ): Promise<ClassifiedTask> {
    if (!this.llm.enabled) {
      return new PlaceholderClassifier().classify(prompt, images);
    }
    try {
      return await this.classifyWithAi(prompt, images);
    } catch (err) {
      // A model/API failure must not break task creation — degrade to a title
      // derived from the prompt rather than surfacing a 500.
      this.logger.warn(
        `classifier AI call failed (${err instanceof Error ? err.message : 'unknown'}); using placeholder title`,
      );
      return new PlaceholderClassifier().classify(prompt, images);
    }
  }

  private async classifyWithAi(
    prompt: string,
    images: ClassifierImage[],
  ): Promise<ClassifiedTask> {
    const uploadsRoot = this.resolveUploadsDir();
    const imageParts: LlmImagePart[] = images
      .filter((img) => IMAGE_MEDIA_TYPES.has(img.mime))
      .map((img) => {
        const abs = isAbsolute(img.path) ? img.path : join(uploadsRoot, img.path);
        return { mime: img.mime, dataBase64: readFileSync(abs).toString('base64') };
      });

    const { data } = await this.llm.generateStructured(
      {
        model: this.llm.getActModel(),
        maxTokens: 256,
        system: TASK_TRIAGE_SYSTEM_PROMPT,
        schema: RECORD_TASK_SCHEMA,
        schemaName: 'record_task',
        schemaDescription: 'Record the classified task title and kind for the submitted prompt.',
        messages: [{ role: 'user', text: prompt, images: imageParts }],
      },
      'classifier',
    );

    const parsed = ClassifiedTaskSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`classifier output failed validation: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  private resolveUploadsDir(): string {
    const p = this.config.gateway.uploadsDir;
    return isAbsolute(p) ? p : resolve(process.cwd(), p);
  }
}
