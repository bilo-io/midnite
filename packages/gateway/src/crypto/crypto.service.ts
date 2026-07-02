import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Encryption-at-rest for stored secrets (provider API keys today; workflow
// credentials later). AES-256-GCM with a per-value random 12-byte IV. The
// symmetric key comes from the MIDNITE_SECRET_KEY env var: 32 bytes encoded as
// hex (64 chars) or base64 (44 chars). Generate one with, e.g.:
//
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//
// Stored format (self-describing, so a row knows whether it's encrypted):
//
//   v1:<base64( iv[12] | tag[16] | ciphertext )>
//
// FAIL-CLOSED policy (decided in phase-7 Theme A):
//   - No env key            ⇒ encryption is *disabled*. A `v1:`-prefixed value
//                             cannot be decrypted → reads as "no usable key";
//                             writing a fresh secret is *rejected* (never a
//                             silent plaintext fallback).
//   - Legacy plaintext rows  ⇒ a value without the `v1:` prefix is read as-is and
//                             upgraded (encrypted) on the next write / startup pass.

export const SECRET_KEY_ENV = 'MIDNITE_SECRET_KEY';
const VERSION_PREFIX = 'v1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Thrown when a write needs the env key but it is absent (fail-closed). */
export class SecretEncryptionUnavailableError extends Error {
  constructor() {
    super(
      `Cannot encrypt secret: ${SECRET_KEY_ENV} is not set. ` +
        `Set it to 32 random bytes (hex or base64) to store provider keys at rest.`,
    );
    this.name = 'SecretEncryptionUnavailableError';
  }
}

/** Whether a stored value is in our encrypted, self-describing format. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(VERSION_PREFIX);
}

/**
 * Decode MIDNITE_SECRET_KEY into a 32-byte buffer. Accepts hex (64 chars) or
 * base64 (any length that decodes to 32 bytes). Returns null when unset; throws
 * when set but malformed (a misconfigured key is a hard error, not fail-open).
 */
function loadKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const raw = env[SECRET_KEY_ENV]?.trim();
  if (!raw) return null;
  // Hex first (a 64-char hex string is also valid base64 of 48 bytes, so the
  // explicit length check disambiguates).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  const b64 = Buffer.from(raw, 'base64');
  if (b64.length === 32) return b64;
  throw new Error(
    `${SECRET_KEY_ENV} must be 32 bytes encoded as hex (64 chars) or base64 (decodes to 32 bytes); got ${raw.length} chars.`,
  );
}

/**
 * Presence + validity of the encryption key, for boot preflight (Phase 54 A).
 * Reuses {@link loadKey}'s canonical rules so the check never drifts from what
 * encryption actually accepts. `unset` — no key (encryption disabled, a soft
 * gap); `valid` — a well-formed 32-byte key; `invalid` — set but malformed
 * (a real misconfiguration).
 */
export function secretKeyPresence(
  env: NodeJS.ProcessEnv = process.env,
): { state: 'unset' | 'valid' | 'invalid'; detail: string } {
  try {
    const key = loadKey(env);
    return key
      ? { state: 'valid', detail: `${SECRET_KEY_ENV} is set (32-byte key)` }
      : { state: 'unset', detail: `${SECRET_KEY_ENV} is not set — secret encryption disabled` };
  } catch (err) {
    return { state: 'invalid', detail: err instanceof Error ? err.message : `${SECRET_KEY_ENV} is malformed` };
  }
}

/**
 * Provider-agnostic secret cipher. Injected into repositories that persist
 * secrets. Reads the env key lazily on each call so a key added/rotated at
 * runtime (or in a test) takes effect without a restart.
 */
@Injectable()
export class CryptoService {
  /** Whether a usable secret key is configured (encryption active). */
  isEnabled(): boolean {
    return loadKey() !== null;
  }

  /**
   * Encrypt a secret for storage. FAIL-CLOSED: throws
   * {@link SecretEncryptionUnavailableError} when no key is configured — callers
   * must never persist plaintext silently.
   */
  encrypt(plaintext: string): string {
    const key = loadKey();
    if (!key) throw new SecretEncryptionUnavailableError();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return VERSION_PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
  }

  /**
   * Decrypt a stored secret to plaintext.
   *   - A non-prefixed (legacy plaintext) value is returned unchanged.
   *   - A `v1:` value with no key, a wrong key, or corruption returns null — the
   *     caller treats null as "no usable key" and degrades (provider disabled).
   */
  decrypt(stored: string): string | null {
    if (!isEncrypted(stored)) return stored; // legacy plaintext — read as-is
    const key = loadKey();
    if (!key) return null; // fail-closed: cannot decrypt without the env key
    try {
      const buf = Buffer.from(stored.slice(VERSION_PREFIX.length), 'base64');
      const iv = buf.subarray(0, IV_BYTES);
      const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
      const ct = buf.subarray(IV_BYTES + TAG_BYTES);
      if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
    } catch {
      return null; // auth-tag mismatch / malformed → no usable key
    }
  }

  /**
   * True when `stored` is a legacy plaintext value that *should* be re-encrypted
   * (a key is configured but the value isn't yet in `v1:` form). Used by the
   * one-time startup upgrade pass.
   */
  needsUpgrade(stored: string): boolean {
    return this.isEnabled() && !isEncrypted(stored);
  }
}
