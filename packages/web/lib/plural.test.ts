import { describe, expect, it } from 'vitest';

import { plural } from './plural';

describe('plural', () => {
  it('returns the singular for a count of 1', () => {
    expect(plural(1, 'memory')).toBe('memory');
    expect(plural(1, 'workflow')).toBe('workflow');
  });

  it('adds -s for regular nouns', () => {
    expect(plural(0, 'workflow')).toBe('workflows');
    expect(plural(3, 'council')).toBe('councils');
    expect(plural(2, 'item')).toBe('items');
  });

  it('applies the consonant + y → -ies rule', () => {
    expect(plural(6, 'memory')).toBe('memories');
    expect(plural(0, 'memory')).toBe('memories');
  });

  it('keeps a vowel + y as +s (not -ies)', () => {
    expect(plural(2, 'day')).toBe('days');
  });

  it('uses an explicit plural override when given', () => {
    expect(plural(2, 'person', 'people')).toBe('people');
    expect(plural(1, 'person', 'people')).toBe('person');
  });
});
