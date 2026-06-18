import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, secretsEncryptionEnabled } from './key-cipher';

const ENV = 'MIDNITE_PROVIDER_KEY';

describe('key-cipher', () => {
  const original = process.env[ENV];
  afterEach(() => {
    if (original === undefined) delete process.env[ENV];
    else process.env[ENV] = original;
  });

  describe('with no key configured', () => {
    beforeEach(() => delete process.env[ENV]);

    it('is a pass-through (plaintext in, plaintext out)', () => {
      expect(secretsEncryptionEnabled()).toBe(false);
      const enc = encryptSecret('sk-plain');
      expect(enc).toBe('sk-plain');
      expect(decryptSecret(enc)).toBe('sk-plain');
    });
  });

  describe('with a key configured', () => {
    beforeEach(() => {
      process.env[ENV] = 'super-secret-passphrase';
    });

    it('round-trips a secret and does not store the plaintext', () => {
      expect(secretsEncryptionEnabled()).toBe(true);
      const enc = encryptSecret('sk-secret-7890');
      expect(enc.startsWith('enc:v1:')).toBe(true);
      expect(enc).not.toContain('sk-secret-7890');
      expect(decryptSecret(enc)).toBe('sk-secret-7890');
    });

    it('still reads pre-encryption plaintext rows', () => {
      expect(decryptSecret('sk-legacy-plain')).toBe('sk-legacy-plain');
    });

    it('returns null for ciphertext when the key is wrong/missing', () => {
      const enc = encryptSecret('sk-secret-7890');
      process.env[ENV] = 'a-different-key';
      expect(decryptSecret(enc)).toBeNull(); // auth tag fails
      delete process.env[ENV];
      expect(decryptSecret(enc)).toBeNull(); // no key at all
    });
  });
});
