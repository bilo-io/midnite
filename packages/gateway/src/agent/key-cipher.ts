import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Optional encryption-at-rest for stored provider API keys. The symmetric key is
// derived (SHA-256) from the MIDNITE_PROVIDER_KEY env var. When it's unset, keys
// are stored as plaintext (back-compat) — encrypt/decrypt become pass-throughs.
//
// Stored format when encrypted: `enc:v1:<base64 iv>:<base64 tag>:<base64 ct>`
// (AES-256-GCM). A value without the prefix is treated as plaintext, so rows
// written before a key was configured keep working.
const ENV_VAR = 'MIDNITE_PROVIDER_KEY';
const PREFIX = 'enc:v1:';

function deriveKey(): Buffer | null {
  const raw = process.env[ENV_VAR];
  if (!raw) return null;
  return createHash('sha256').update(raw).digest(); // 32 bytes for AES-256
}

/** Whether a MIDNITE_PROVIDER_KEY is configured (encryption active). */
export function secretsEncryptionEnabled(): boolean {
  return deriveKey() !== null;
}

/** Encrypt a secret for storage. Returns plaintext unchanged when no key is set. */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  if (!key) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ct].map((b) => b.toString('base64')).join(':');
}

/**
 * Decrypt a stored secret. A plaintext value (no `enc:` prefix) is returned as-is.
 * Returns null when the value is encrypted but the key is missing or wrong — the
 * caller treats that as "no usable key" and degrades gracefully.
 */
export function decryptSecret(stored: string): string | null {
  if (!stored.startsWith(PREFIX)) return stored;
  const key = deriveKey();
  if (!key) return null;
  const [ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split(':');
  if (!ivB64 || !tagB64 || !ctB64) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}
