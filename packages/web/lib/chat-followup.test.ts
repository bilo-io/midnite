import { describe, expect, it } from 'vitest';
import { expandFollowup, isFollowup } from './chat-followup';

describe('expandFollowup', () => {
  it('returns null with no prior affected ids', () => {
    expect(expandFollowup('make those p1', [])).toBeNull();
  });

  it('returns null when the text has no back-reference', () => {
    expect(expandFollowup('add "new task"', ['t1', 't2'])).toBeNull();
  });

  it('expands a plural back-reference to one command per id', () => {
    expect(expandFollowup('move those to wip', ['t1', 't2'])).toEqual(['move t1 to wip', 'move t2 to wip']);
  });

  it('resolves a singular "it" against a single prior id', () => {
    expect(expandFollowup('set it p3', ['t9'])).toEqual(['set t9 p3']);
  });

  it('is case-insensitive on the pronoun', () => {
    expect(expandFollowup('Move THEM to done', ['a'])).toEqual(['Move a to done']);
  });

  it('isFollowup mirrors expandFollowup', () => {
    expect(isFollowup('make those p1', ['t1'])).toBe(true);
    expect(isFollowup('add "x"', ['t1'])).toBe(false);
  });
});
