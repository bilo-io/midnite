import { describe, expect, it } from 'vitest';
import { MEMORY_ARTIFACT_KINDS } from '@midnite/shared';
import { extractSvg, stripMarkdownFence, studioPromptFor } from './studio-prompts';

describe('studioPromptFor', () => {
  it('has a prompt for every kind and embeds the corpus', () => {
    for (const kind of MEMORY_ARTIFACT_KINDS) {
      const p = studioPromptFor(kind, 'MY_CORPUS');
      expect(p.system.length).toBeGreaterThan(0);
      expect(p.userText).toContain('MY_CORPUS');
      expect(p.maxTokens).toBeGreaterThan(0);
    }
  });

  it('the infographic prompt asks for a single SVG', () => {
    expect(studioPromptFor('infographic', 'c').system.toLowerCase()).toContain('svg');
  });
});

describe('extractSvg', () => {
  it('pulls the <svg> slice out of a fenced/wrapped response', () => {
    const raw = 'Sure:\n```svg\n<svg viewBox="0 0 1 1"><g/></svg>\n```\nDone';
    expect(extractSvg(raw)).toBe('<svg viewBox="0 0 1 1"><g/></svg>');
  });

  it('returns trimmed input when no svg tag present', () => {
    expect(extractSvg('  no svg here  ')).toBe('no svg here');
  });
});

describe('stripMarkdownFence', () => {
  it('removes a wrapping markdown fence', () => {
    expect(stripMarkdownFence('```markdown\n# Hi\n```')).toBe('# Hi');
    expect(stripMarkdownFence('```\nplain\n```')).toBe('plain');
  });

  it('leaves unfenced markdown untouched', () => {
    expect(stripMarkdownFence('# Heading\n\ntext')).toBe('# Heading\n\ntext');
  });
});
