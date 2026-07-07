/**
 * Phase 64 Theme B — guest identity for the no-auth local default. A stable guest
 * id (generated once) + display name persist in localStorage; the office ships
 * them in the presence `hello` frame. When JWT auth is on the server overrides
 * both with the verified identity, so this is purely the local-mode story.
 */

const ID_KEY = 'midnite.presence.guest-id';
const NAME_KEY = 'midnite.presence.guest-name';

/** A short, human-ish default name so the roster isn't full of "Guest". */
const DEFAULT_NAMES = [
  'Explorer',
  'Wanderer',
  'Newcomer',
  'Visitor',
  'Teammate',
] as const;

function randomId(): string {
  // crypto.randomUUID is available in every browser we target; fall back defensively.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `g-${Math.abs(hashString(String(Date.now())))}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** A stable, friendly default name derived from the guest id (no prompt needed). */
export function defaultGuestName(guestId: string): string {
  const idx = Math.abs(hashString(guestId)) % DEFAULT_NAMES.length;
  const suffix = (Math.abs(hashString(guestId)) % 90) + 10; // 10–99
  return `${DEFAULT_NAMES[idx]} ${suffix}`;
}

/** The persisted guest id, generating + storing one on first use. */
export function ensureGuestId(): string {
  if (typeof window === 'undefined') return 'guest';
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
}

/** The chosen display name, or null if the guest hasn't named themselves yet. */
export function loadGuestName(): string | null {
  if (typeof window === 'undefined') return null;
  const name = window.localStorage.getItem(NAME_KEY);
  return name && name.trim() ? name : null;
}

/** Persist a chosen display name (trimmed + length-capped to the wire bound). */
export function saveGuestName(name: string): string {
  const clean = name.trim().slice(0, 40);
  if (typeof window !== 'undefined' && clean) window.localStorage.setItem(NAME_KEY, clean);
  return clean;
}

export interface GuestIdentity {
  guestId: string;
  name: string;
  /** True when the name is the generated default (the office may prompt to set one). */
  isDefault: boolean;
}

/** Resolve the guest identity, falling back to a friendly default name. */
export function loadGuestIdentity(): GuestIdentity {
  const guestId = ensureGuestId();
  const stored = loadGuestName();
  return {
    guestId,
    name: stored ?? defaultGuestName(guestId),
    isDefault: stored === null,
  };
}
