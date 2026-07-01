import { randomBytes } from 'node:crypto';
import type { CryptoService } from '../../crypto/crypto.service';
import type { TeamsService } from '../../teams/teams.service';

/**
 * Shared primitives for a **team-scoped, secret-bearing integration entity** — the
 * common core of Phase 44's outbound webhooks and Phase 46's inbound sources: a
 * per-entity HMAC secret (generated, encrypted at rest, revealed once), team-scope
 * checks, and the team-admin RBAC gate. Both services use these so the secret +
 * access rules live in exactly one place.
 */

/** Generate a prefixed random signing secret (the prefix makes it identifiable). */
export function generateSecret(prefix: string): string {
  return prefix + randomBytes(24).toString('hex');
}

/**
 * Encrypt a raw secret when encryption is **active** (a key is configured); store
 * it raw only when crypto is absent or keyless (encryption off by design in dev).
 * Gating on `isEnabled()` keeps the fail-closed guarantee — with a key present we
 * always encrypt (never silently persist plaintext) — while letting a keyless dev
 * / e2e gateway still create sources.
 */
export function encryptSecret(crypto: CryptoService | undefined, raw: string): string {
  return crypto && crypto.isEnabled() ? crypto.encrypt(raw) : raw;
}

/**
 * Decrypt a stored secret when crypto is wired; pass the raw value through when
 * crypto is absent (unit/dev). Returns null only when a key is configured but the
 * value can't be decrypted (fail-closed) — the receiver (Theme B) treats that as
 * an unusable secret.
 */
export function decryptSecret(crypto: CryptoService | undefined, stored: string): string | null {
  return crypto ? crypto.decrypt(stored) : stored;
}

/**
 * Team-admin gate for managing a team-scoped secret entity. With no team context
 * (single-user / JWT off) the local operator is implicitly privileged. Throws the
 * caller's domain error (via `onForbidden`) when the role is insufficient.
 */
export function assertTeamAdmin(
  teams: TeamsService | undefined,
  teamId: string | null | undefined,
  userId: string | null | undefined,
  onForbidden: () => Error,
): void {
  if (!teamId) return;
  const role = teams?.getMembership(teamId, userId ?? '') ?? null;
  if (role !== 'admin' && role !== 'owner') throw onForbidden();
}

/** Whether a row belongs to the caller's team scope (null team = single-user). */
export function isInTeamScope(
  rowTeamId: string | null | undefined,
  teamId: string | null | undefined,
): boolean {
  return (rowTeamId ?? null) === (teamId ?? null);
}
