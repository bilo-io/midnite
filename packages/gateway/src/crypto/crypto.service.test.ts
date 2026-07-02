import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CryptoService,
  SECRET_KEY_ENV,
  SecretEncryptionUnavailableError,
  isEncrypted,
  secretKeyPresence,
} from './crypto.service';

const HEX_KEY = randomBytes(32).toString('hex');
const B64_KEY = randomBytes(32).toString('base64');

describe('CryptoService', () => {
  const original = process.env[SECRET_KEY_ENV];
  let svc: CryptoService;

  beforeEach(() => {
    svc = new CryptoService();
  });
  afterEach(() => {
    if (original === undefined) delete process.env[SECRET_KEY_ENV];
    else process.env[SECRET_KEY_ENV] = original;
  });

  describe('secretKeyPresence (Phase 54 preflight)', () => {
    it('reports valid for hex + base64 keys, unset when absent, invalid when malformed', () => {
      expect(secretKeyPresence({ [SECRET_KEY_ENV]: HEX_KEY }).state).toBe('valid');
      expect(secretKeyPresence({ [SECRET_KEY_ENV]: B64_KEY }).state).toBe('valid');
      expect(secretKeyPresence({}).state).toBe('unset');
      expect(secretKeyPresence({ [SECRET_KEY_ENV]: 'nope' }).state).toBe('invalid');
    });
  });

  describe('with a key configured', () => {
    beforeEach(() => {
      process.env[SECRET_KEY_ENV] = HEX_KEY;
    });

    it('round-trips a secret and never stores the plaintext', () => {
      expect(svc.isEnabled()).toBe(true);
      const enc = svc.encrypt('sk-secret-7890');
      expect(isEncrypted(enc)).toBe(true);
      expect(enc.startsWith('v1:')).toBe(true);
      expect(enc).not.toContain('sk-secret-7890');
      expect(svc.decrypt(enc)).toBe('sk-secret-7890');
    });

    it('produces a fresh IV per call (ciphertexts differ)', () => {
      const a = svc.encrypt('same-input');
      const b = svc.encrypt('same-input');
      expect(a).not.toBe(b);
      expect(svc.decrypt(a)).toBe('same-input');
      expect(svc.decrypt(b)).toBe('same-input');
    });

    it('accepts a base64-encoded key too', () => {
      process.env[SECRET_KEY_ENV] = B64_KEY;
      const enc = svc.encrypt('hello');
      expect(svc.decrypt(enc)).toBe('hello');
    });

    it('reads legacy plaintext as-is and flags it for upgrade', () => {
      expect(svc.decrypt('sk-legacy-plain')).toBe('sk-legacy-plain');
      expect(svc.needsUpgrade('sk-legacy-plain')).toBe(true);
      expect(svc.needsUpgrade(svc.encrypt('already-enc'))).toBe(false);
    });

    it('returns null when the key is wrong (auth-tag fails)', () => {
      const enc = svc.encrypt('sk-secret-7890');
      process.env[SECRET_KEY_ENV] = randomBytes(32).toString('hex');
      expect(svc.decrypt(enc)).toBeNull();
    });

    it('throws on a malformed key', () => {
      process.env[SECRET_KEY_ENV] = 'too-short';
      expect(() => svc.isEnabled()).toThrow(/32 bytes/);
    });
  });

  describe('fail-closed with no key configured', () => {
    beforeEach(() => delete process.env[SECRET_KEY_ENV]);

    it('reports disabled', () => {
      expect(svc.isEnabled()).toBe(false);
    });

    it('rejects writes (no silent plaintext fallback)', () => {
      expect(() => svc.encrypt('sk-new')).toThrow(SecretEncryptionUnavailableError);
    });

    it('returns null for an encrypted value (provider reads as no key)', () => {
      process.env[SECRET_KEY_ENV] = HEX_KEY;
      const enc = svc.encrypt('sk-secret');
      delete process.env[SECRET_KEY_ENV];
      expect(svc.decrypt(enc)).toBeNull();
    });

    it('still reads legacy plaintext', () => {
      expect(svc.decrypt('sk-legacy-plain')).toBe('sk-legacy-plain');
      expect(svc.needsUpgrade('sk-legacy-plain')).toBe(false); // no key → cannot upgrade
    });
  });
});
