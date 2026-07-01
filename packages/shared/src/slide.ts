import { z } from 'zod';

// A single slide chooses its own authoring format (Decision §1). `content` is the
// raw Markdown or HTML body; `notes` are optional speaker notes.
export const SlideFormatSchema = z.enum(['md', 'html']);
export type SlideFormat = z.infer<typeof SlideFormatSchema>;

// Deck-level badge: the single per-slide format, or `mixed` when slides differ.
export const DeckFormatSchema = z.enum(['md', 'html', 'mixed']);
export type DeckFormat = z.infer<typeof DeckFormatSchema>;

export const SlideSchema = z.object({
  id: z.string(),
  format: SlideFormatSchema,
  content: z.string(),
  notes: z.string().optional(),
});
export type Slide = z.infer<typeof SlideSchema>;

// Optional per-deck theme override (Decision §4). Each channel is an HSL triplet
// like "222 47% 11%", layered over the app's inherited theme vars.
export const DeckThemeSchema = z.object({
  background: z.string().optional(),
  foreground: z.string().optional(),
  accent: z.string().optional(),
});
export type DeckTheme = z.infer<typeof DeckThemeSchema>;

// The deck body — persisted as a single JSON column (Decision §2). Empty decks
// are allowed; the editor fills them in.
export const DeckContentSchema = z.object({
  slides: z.array(SlideSchema).default([]),
  theme: DeckThemeSchema.optional(),
});
export type DeckContent = z.infer<typeof DeckContentSchema>;

export const DeckSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(8000).optional(),
  // Derived from `content` server-side; present for list/detail alike.
  slideCount: z.number().int().nonnegative(),
  format: DeckFormatSchema,
  content: DeckContentSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  teamId: z.string().optional(),
});
export type Deck = z.infer<typeof DeckSchema>;

// List-optimized projection — no `content` body.
export const DeckSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  slideCount: z.number().int().nonnegative(),
  format: DeckFormatSchema,
  updatedAt: z.string(),
  teamId: z.string().optional(),
});
export type DeckSummary = z.infer<typeof DeckSummarySchema>;

export const CreateDeckRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(8000).optional(),
  // Optional seed body; omitted → an empty deck.
  content: DeckContentSchema.optional(),
});
export type CreateDeckRequest = z.infer<typeof CreateDeckRequestSchema>;

export const UpdateDeckRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(8000).optional(),
  content: DeckContentSchema.optional(),
});
export type UpdateDeckRequest = z.infer<typeof UpdateDeckRequestSchema>;

export const DeckResponseSchema = z.object({ deck: DeckSchema });
export type DeckResponse = z.infer<typeof DeckResponseSchema>;

/**
 * Deck-level format badge derived from its slides: the single shared format, or
 * `mixed` when they differ. An empty deck defaults to `md`.
 */
export function deriveDeckFormat(slides: Slide[]): DeckFormat {
  const first = slides[0];
  if (!first) return 'md';
  return slides.every((s) => s.format === first.format) ? first.format : 'mixed';
}
