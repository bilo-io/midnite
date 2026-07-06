import { describe, expect, it } from 'vitest';
import { sliceHtml, visibleLen } from './html-type';

describe('visibleLen', () => {
  it('counts visible characters, skipping tags', () => {
    expect(visibleLen('<strong>abc</strong>')).toBe(3);
  });

  it('counts an entity as a single character', () => {
    expect(visibleLen('a&amp;b')).toBe(3);
  });
});

describe('sliceHtml', () => {
  it('returns the whole string when n covers all visible chars', () => {
    expect(sliceHtml('<em>hi</em>', 5)).toBe('<em>hi</em>');
  });

  it('never splits a tag and auto-closes tags left open by the cut', () => {
    const out = sliceHtml('<strong>abcdef</strong>', 3);
    expect(out).toBe('<strong>abc</strong>');
  });

  it('keeps nested tags balanced', () => {
    const out = sliceHtml('<a href="/x"><em>abcd</em></a>', 2);
    // opens a + em, shows "ab", then closes em then a
    expect(out).toBe('<a href="/x"><em>ab</em></a>');
  });

  it('treats an entity as one visible char, never truncating mid-entity', () => {
    const out = sliceHtml('x&amp;y', 2);
    expect(out).toBe('x&amp;');
  });
});
