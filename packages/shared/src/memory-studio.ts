import { z } from 'zod';

/**
 * Phase 65 E — structured shapes the LLM produces for the file-backed Studio
 * artifacts (audio & video), validated in the gateway before rendering. Kept in
 * `shared` (the contract) since they cross the LLM boundary; the JSON-Schema
 * mirrors drive `generateStructured`. The prompts + markdown renderers are pure
 * gateway helpers (`memories/lib/studio-media.ts`).
 */

export const AudioScriptSchema = z.object({
  title: z.string().min(1).max(200),
  segments: z
    .array(
      z.object({
        speaker: z.enum(['A', 'B']),
        text: z.string().min(1),
      }),
    )
    .min(1)
    .max(40),
});
export type AudioScript = z.infer<typeof AudioScriptSchema>;

/** JSON Schema mirror of {@link AudioScriptSchema} for `generateStructured`. */
export const AUDIO_SCRIPT_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'segments'],
  properties: {
    title: { type: 'string' },
    segments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['speaker', 'text'],
        properties: {
          speaker: { type: 'string', enum: ['A', 'B'] },
          text: { type: 'string' },
        },
      },
    },
  },
};

export const VideoDeckSchema = z.object({
  title: z.string().min(1).max(200),
  slides: z
    .array(
      z.object({
        heading: z.string().min(1).max(120),
        bullets: z.array(z.string().min(1)).max(6).default([]),
        narration: z.string().min(1),
      }),
    )
    .min(1)
    .max(12),
});
export type VideoDeck = z.infer<typeof VideoDeckSchema>;

/** JSON Schema mirror of {@link VideoDeckSchema} for `generateStructured`. */
export const VIDEO_DECK_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'slides'],
  properties: {
    title: { type: 'string' },
    slides: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'bullets', 'narration'],
        properties: {
          heading: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
          narration: { type: 'string' },
        },
      },
    },
  },
};
