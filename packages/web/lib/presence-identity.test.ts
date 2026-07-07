import { beforeEach, describe, expect, it } from 'vitest';
import { defaultGuestName, ensureGuestId, loadGuestIdentity, loadGuestName, saveGuestName } from './presence-identity';

describe('presence-identity', () => {
  beforeEach(() => window.localStorage.clear());

  it('generates a stable guest id, persisted across calls', () => {
    const first = ensureGuestId();
    expect(first).toBeTruthy();
    expect(ensureGuestId()).toBe(first);
  });

  it('derives a deterministic friendly default name from the id', () => {
    expect(defaultGuestName('abc')).toBe(defaultGuestName('abc'));
    expect(defaultGuestName('abc')).toMatch(/^[A-Za-z]+ \d{2}$/);
  });

  it('saves + loads a name, trimming and capping to 40 chars', () => {
    expect(loadGuestName()).toBeNull();
    saveGuestName('  Ada Lovelace  ');
    expect(loadGuestName()).toBe('Ada Lovelace');
    const long = 'x'.repeat(60);
    expect(saveGuestName(long)).toHaveLength(40);
  });

  it('loadGuestIdentity falls back to the default until a name is chosen', () => {
    const before = loadGuestIdentity();
    expect(before.isDefault).toBe(true);
    expect(before.name).toBe(defaultGuestName(before.guestId));

    saveGuestName('Bo');
    const after = loadGuestIdentity();
    expect(after.isDefault).toBe(false);
    expect(after.name).toBe('Bo');
    expect(after.guestId).toBe(before.guestId); // id stable across the rename
  });
});
