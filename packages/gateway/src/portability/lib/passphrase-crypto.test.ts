import { describe, expect, it } from 'vitest';
import { deriveKey, newKdfParams, unwrapSecret, wrapSecret } from './passphrase-crypto';

describe('passphrase-crypto (Phase 49 G)', () => {
  it('round-trips a secret with the matching passphrase', () => {
    const kdf = newKdfParams();
    const key = deriveKey('hunter2', kdf);
    const blob = wrapSecret('sk-secret-value', key);
    expect(blob.startsWith('p1:')).toBe(true);
    expect(unwrapSecret(blob, key)).toBe('sk-secret-value');
  });

  it('fails (null) on a wrong passphrase — never throws, never leaks', () => {
    const kdf = newKdfParams();
    const blob = wrapSecret('top-secret', deriveKey('right', kdf));
    expect(unwrapSecret(blob, deriveKey('wrong', kdf))).toBeNull();
  });

  it('a fresh salt per export makes the same passphrase derive a different key', () => {
    const a = newKdfParams();
    const b = newKdfParams();
    expect(a.salt).not.toBe(b.salt);
    // A blob wrapped under salt A can't be unwrapped with salt B's key.
    const blob = wrapSecret('x', deriveKey('pw', a));
    expect(unwrapSecret(blob, deriveKey('pw', b))).toBeNull();
  });

  it('rejects a non-p1 blob', () => {
    expect(unwrapSecret('v1:notours', deriveKey('pw', newKdfParams()))).toBeNull();
  });
});
