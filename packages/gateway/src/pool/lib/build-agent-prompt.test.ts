import { describe, expect, it } from 'vitest';
import type { GlobalSource } from '@midnite/shared';
import { buildAgentPrompt } from './build-agent-prompt';

function source(url: string, title?: string): GlobalSource {
  return { id: url, url, kind: 'link', title, createdAt: 'now', position: 0 } as GlobalSource;
}

describe('buildAgentPrompt', () => {
  it('returns the bare prompt when there is no knowledge base', () => {
    expect(buildAgentPrompt('  do the thing  ', [])).toBe('do the thing');
  });

  it('appends knowledge-base links as a reference section', () => {
    const out = buildAgentPrompt('implement X', [
      source('https://docs.example.com', 'Docs'),
      source('https://example.com/raw'),
    ]);
    expect(out).toContain('implement X');
    expect(out).toContain('## Reference material (midnite knowledge base)');
    expect(out).toContain('- Docs — https://docs.example.com');
    expect(out).toContain('- https://example.com/raw');
  });
});
