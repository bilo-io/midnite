import { describe, expect, it } from 'vitest';
import {
  CreateDeckRequestSchema,
  DeckContentSchema,
  DeckSchema,
  SlideSchema,
  UpdateDeckRequestSchema,
  deriveDeckFormat,
  type Slide,
} from './slide.js';

const mdSlide = (over: Partial<Slide> = {}): Slide => ({ id: 's1', format: 'md', content: '# hi', ...over });

describe('SlideSchema', () => {
  it('parses a valid slide and rejects an unknown format', () => {
    expect(SlideSchema.parse(mdSlide()).format).toBe('md');
    expect(SlideSchema.safeParse({ id: 's1', format: 'pptx', content: 'x' }).success).toBe(false);
  });

  it('allows optional speaker notes', () => {
    expect(SlideSchema.parse(mdSlide({ notes: 'say this' })).notes).toBe('say this');
  });
});

describe('DeckContentSchema', () => {
  it('defaults slides to an empty array (empty decks allowed)', () => {
    expect(DeckContentSchema.parse({}).slides).toEqual([]);
  });

  it('round-trips slides + a theme override', () => {
    const content = { slides: [mdSlide(), mdSlide({ id: 's2', format: 'html', content: '<h1/>' })], theme: { accent: '210 90% 50%' } };
    expect(DeckContentSchema.parse(content)).toEqual(content);
  });
});

describe('deriveDeckFormat', () => {
  it('returns md for an empty deck', () => {
    expect(deriveDeckFormat([])).toBe('md');
  });

  it('returns the single shared format', () => {
    expect(deriveDeckFormat([mdSlide(), mdSlide({ id: 's2' })])).toBe('md');
    expect(deriveDeckFormat([mdSlide({ format: 'html' })])).toBe('html');
  });

  it('returns mixed when slide formats differ', () => {
    expect(deriveDeckFormat([mdSlide(), mdSlide({ id: 's2', format: 'html' })])).toBe('mixed');
  });
});

describe('CreateDeckRequestSchema', () => {
  it('requires a non-empty name and trims it', () => {
    expect(CreateDeckRequestSchema.parse({ name: '  Deck  ' }).name).toBe('Deck');
    expect(CreateDeckRequestSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('accepts an optional seed content', () => {
    const parsed = CreateDeckRequestSchema.parse({ name: 'D', content: { slides: [mdSlide()] } });
    expect(parsed.content?.slides).toHaveLength(1);
  });
});

describe('UpdateDeckRequestSchema', () => {
  it('is fully partial (empty object is valid)', () => {
    expect(UpdateDeckRequestSchema.safeParse({}).success).toBe(true);
  });
});

describe('DeckSchema', () => {
  it('parses a full deck', () => {
    const deck = {
      id: 'd1',
      name: 'Deck',
      slideCount: 1,
      format: 'md' as const,
      content: { slides: [mdSlide()] },
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    };
    expect(DeckSchema.parse(deck).slideCount).toBe(1);
  });
});
