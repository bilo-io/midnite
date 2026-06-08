import { describe, expect, it } from 'vitest';
import { hashToken, tokenMatches } from './token-hash';

describe('token-hash', () => {
  it('produces a stable 64-char hex digest', () => {
    const hash = hashToken('secret-token');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('secret-token')).toBe(hash);
  });

  it('matches a token against its own hash', () => {
    const token = 'a-very-secret-value';
    expect(tokenMatches(token, hashToken(token))).toBe(true);
  });

  it('rejects a wrong token', () => {
    expect(tokenMatches('wrong', hashToken('right'))).toBe(false);
  });

  it('rejects a malformed/empty expected hash without throwing', () => {
    expect(tokenMatches('x', '')).toBe(false);
    expect(tokenMatches('x', 'not-hex')).toBe(false);
  });
});
