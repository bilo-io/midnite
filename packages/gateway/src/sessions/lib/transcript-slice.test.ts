import { describe, expect, it } from 'vitest';
import type { TranscriptMessage } from '@midnite/shared';

import { transcriptExcerpt } from './transcript-slice';

function msg(i: number, role: TranscriptMessage['role'], text: string, toolCalls?: TranscriptMessage['toolCalls']): TranscriptMessage {
  return { uuid: `m${i}`, role, timestamp: 1_700_000_000_000 + i, text, toolCalls };
}

describe('transcriptExcerpt', () => {
  it('returns empty string for no messages', () => {
    expect(transcriptExcerpt([])).toBe('');
  });

  it('includes only the trailing N messages by default', () => {
    const messages = Array.from({ length: 30 }, (_, i) => msg(i, i % 2 ? 'assistant' : 'user', `line ${i}`));
    const out = transcriptExcerpt(messages, { tailMessages: 5, failureContext: 0 });
    expect(out).toContain('line 29');
    expect(out).toContain('line 25');
    expect(out).not.toContain('line 24');
  });

  it('pulls in earlier failure-adjacent messages as context', () => {
    const messages = [
      msg(0, 'user', 'start the task'),
      msg(1, 'assistant', 'running tests', [{ name: 'Bash', summary: 'npm test — Error: assertion failed' }]),
      ...Array.from({ length: 10 }, (_, i) => msg(i + 2, 'assistant', `progress ${i}`)),
    ];
    const out = transcriptExcerpt(messages, { tailMessages: 3, failureContext: 2 });
    // The failing tool call sits well before the tail but must be surfaced.
    expect(out).toContain('assertion failed');
    // …and a gap marker separates it from the contiguous tail.
    expect(out).toContain('…');
  });

  it('summarises tool calls and caps their count', () => {
    const calls = Array.from({ length: 5 }, (_, i) => ({ name: `Tool${i}`, summary: `did ${i}` }));
    const out = transcriptExcerpt([msg(0, 'assistant', 'work', calls)], { maxToolCalls: 2 });
    expect(out).toContain('⨯ Tool0');
    expect(out).toContain('⨯ Tool1');
    expect(out).toContain('+3 more tool call(s)');
    expect(out).not.toContain('⨯ Tool2');
  });

  it('hard-caps the output length, keeping the most recent content', () => {
    const messages = Array.from({ length: 40 }, (_, i) => msg(i, 'assistant', `msg-${i} `.repeat(50)));
    const out = transcriptExcerpt(messages, { maxChars: 500, tailMessages: 40 });
    expect(out.length).toBeLessThanOrEqual(500);
    expect(out.startsWith('…')).toBe(true);
    // The final message's content survives the front-trim.
    expect(out).toContain('msg-39');
  });

  it('truncates an oversized single message', () => {
    const out = transcriptExcerpt([msg(0, 'user', 'x'.repeat(5000))], { maxMessageChars: 100, maxChars: 10000 });
    expect(out.length).toBeLessThan(200);
    expect(out).toContain('…');
  });
});
