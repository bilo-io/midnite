import { describe, expect, it } from 'vitest';
import { AudioScriptSchema, VideoDeckSchema } from './memory-studio.js';

describe('memory-studio LLM output schemas', () => {
  it('parses a valid two-host audio script', () => {
    const script = {
      title: 'Rockets',
      segments: [
        { speaker: 'A', text: 'Why up?' },
        { speaker: 'B', text: 'Newton.' },
      ],
    };
    expect(AudioScriptSchema.parse(script)).toEqual(script);
  });

  it('rejects an audio script with an unknown speaker', () => {
    expect(
      AudioScriptSchema.safeParse({ title: 't', segments: [{ speaker: 'C', text: 'x' }] }).success,
    ).toBe(false);
  });

  it('rejects an empty audio script', () => {
    expect(AudioScriptSchema.safeParse({ title: 't', segments: [] }).success).toBe(false);
  });

  it('parses a valid video deck and defaults empty bullets', () => {
    const parsed = VideoDeckSchema.parse({
      title: 'Rockets',
      slides: [{ heading: 'Thrust', narration: 'Push mass down.' }],
    });
    expect(parsed.slides[0]!.bullets).toEqual([]);
  });

  it('rejects a deck with a slide missing narration', () => {
    expect(
      VideoDeckSchema.safeParse({ title: 't', slides: [{ heading: 'h', bullets: [] }] }).success,
    ).toBe(false);
  });
});
