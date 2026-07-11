import { describe, expect, it } from 'vitest';
import type { TranscriptMessage } from '@midnite/shared';

import { sliceTranscript } from './transcript-slice';

function msg(i: number, text: string, role: TranscriptMessage['role'] = 'user'): TranscriptMessage {
  return { uuid: `m${i}`, role, timestamp: i, text };
}

describe('sliceTranscript', () => {
  it('returns empty for a missing or empty transcript', () => {
    expect(sliceTranscript(undefined)).toBe('');
    expect(sliceTranscript([])).toBe('');
  });

  it('keeps the tail-N messages', () => {
    const messages = Array.from({ length: 20 }, (_, i) => msg(i, `line ${i}`));
    const out = sliceTranscript(messages, { tailMessages: 3, charCap: 10_000 });
    expect(out).toContain('line 19');
    expect(out).toContain('line 17');
    expect(out).not.toContain('line 5');
  });

  it('pulls in failure-adjacent context outside the tail', () => {
    const messages = [
      msg(0, 'kickoff'),
      msg(1, 'Error: build broke', 'assistant'),
      msg(2, 'retrying'),
      ...Array.from({ length: 15 }, (_, i) => msg(3 + i, `tail ${i}`)),
    ];
    const out = sliceTranscript(messages, { tailMessages: 2, charCap: 10_000 });
    // The failing message + its neighbours are included even though far from the tail.
    expect(out).toContain('Error: build broke');
    expect(out).toContain('kickoff');
    expect(out).toContain('retrying');
  });

  it('respects the hard char cap and keeps the most recent content', () => {
    const messages = Array.from({ length: 50 }, (_, i) => msg(i, `message body number ${i}`));
    const cap = 120;
    const out = sliceTranscript(messages, { tailMessages: 50, charCap: cap });
    expect(out.length).toBeLessThanOrEqual(cap);
    expect(out.startsWith('…')).toBe(true);
    // The tail (latest message) survives truncation.
    expect(out).toContain('number 49');
  });

  it('skips blank messages', () => {
    const out = sliceTranscript([msg(0, '   '), msg(1, 'real text')], { charCap: 1000 });
    expect(out).toBe('user: real text');
  });
});
