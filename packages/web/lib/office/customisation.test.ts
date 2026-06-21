import { describe, expect, it } from 'vitest';
import {
  CHARACTER_OPTIONS,
  DEFAULT_CUSTOMISATION,
  resolveCharacter,
} from './customisation';

describe('CHARACTER_OPTIONS', () => {
  it('has unique keys and a human default first', () => {
    const keys = CHARACTER_OPTIONS.map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(CHARACTER_OPTIONS[0]).toMatchObject({ key: 'human', kind: 'human', variant: 0 });
  });

  it('only uses variant 0 for the human kind', () => {
    for (const o of CHARACTER_OPTIONS) {
      if (o.kind === 'human') expect(o.variant).toBe(0);
    }
  });
});

describe('resolveCharacter', () => {
  it('resolves a known character key to its kind/variant', () => {
    expect(resolveCharacter({ character: 'robot-3', tint: null })).toEqual({
      kind: 'robot',
      variant: 3,
    });
  });

  it('falls back to the default character for an unknown key', () => {
    expect(resolveCharacter({ character: 'nope', tint: null })).toEqual({
      kind: 'human',
      variant: 0,
    });
  });

  it('resolves the default customisation to the human character', () => {
    expect(resolveCharacter(DEFAULT_CUSTOMISATION)).toEqual({ kind: 'human', variant: 0 });
  });
});
