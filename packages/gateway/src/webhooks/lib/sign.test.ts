import { describe, expect, it } from 'vitest';

import { signPayload, verifySignature } from './sign';

describe('signPayload / verifySignature', () => {
  const secret = 'whsec_abc123';
  const body = JSON.stringify({ event: 'task.updated', task: { id: 't1' } });
  const ts = '2026-06-30T12:00:00.000Z';

  it('is deterministic and prefixed with sha256=', () => {
    const a = signPayload(secret, body, ts);
    const b = signPayload(secret, body, ts);
    expect(a).toBe(b);
    expect(a.startsWith('sha256=')).toBe(true);
  });

  it('covers the timestamp — a different timestamp changes the signature', () => {
    expect(signPayload(secret, body, ts)).not.toBe(signPayload(secret, body, '2026-06-30T12:00:01.000Z'));
  });

  it('verifies a genuine signature and rejects a tampered body / wrong secret', () => {
    const sig = signPayload(secret, body, ts);
    expect(verifySignature(secret, body, ts, sig)).toBe(true);
    expect(verifySignature(secret, body + ' ', ts, sig)).toBe(false);
    expect(verifySignature('whsec_other', body, ts, sig)).toBe(false);
  });
});
