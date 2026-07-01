import { describe, expect, it } from 'vitest';
import type { Slide } from '@midnite/shared';
import {
  buildSlidesHtml,
  contentEquals,
  moveItem,
  newSlide,
  themeStyleVars,
} from './deck-content';

const md = (content: string, over: Partial<Slide> = {}): Slide => ({
  id: 'x',
  format: 'md',
  content,
  ...over,
});

describe('newSlide', () => {
  it('creates a slide of the requested format with a unique id', () => {
    const a = newSlide('html');
    const b = newSlide('html');
    expect(a.format).toBe('html');
    expect(a.id).not.toBe(b.id);
  });
});

describe('moveItem', () => {
  it('moves an item to a new index', () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
  });
  it('is a no-op for equal or out-of-range indices', () => {
    expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 0, 9)).toEqual([1, 2, 3]);
  });
});

describe('buildSlidesHtml', () => {
  const noop = (html: string) => html;

  it('renders a placeholder for an empty deck', () => {
    expect(buildSlidesHtml([], noop)).toContain('Empty deck');
  });

  it('wraps markdown slides in a data-markdown template', () => {
    const html = buildSlidesHtml([md('# Hi')], noop);
    expect(html).toContain('data-markdown');
    expect(html).toContain('<script type="text/template"># Hi</script>');
  });

  it('sanitizes html slides via the injected sanitizer', () => {
    const sanitize = (h: string) => h.replace(/<script>.*<\/script>/g, '');
    const html = buildSlidesHtml([md('<b>ok</b><script>evil()</script>', { format: 'html' })], sanitize);
    expect(html).toContain('<b>ok</b>');
    expect(html).not.toContain('evil()');
  });

  it('neutralises a closing script tag inside markdown', () => {
    const html = buildSlidesHtml([md('text </script> more')], noop);
    expect(html).not.toContain('text </script> more');
    expect(html).toContain('<\\/script>');
  });

  it('emits speaker notes when present', () => {
    const html = buildSlidesHtml([md('# Hi', { notes: 'remember this' })], noop);
    expect(html).toContain('class="notes"');
    expect(html).toContain('remember this');
  });
});

describe('themeStyleVars', () => {
  it('maps only the set channels to CSS vars', () => {
    expect(themeStyleVars({ accent: '10 20% 30%' })).toEqual({ '--accent': '10 20% 30%' });
    expect(themeStyleVars(undefined)).toEqual({});
  });
});

describe('contentEquals', () => {
  it('compares deck bodies structurally', () => {
    expect(contentEquals({ slides: [md('a')] }, { slides: [md('a')] })).toBe(true);
    expect(contentEquals({ slides: [md('a')] }, { slides: [md('b')] })).toBe(false);
  });
});
