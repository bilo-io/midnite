import { describe, expect, it, vi } from 'vitest';

import {
  assertTeamAdmin,
  decryptSecret,
  encryptSecret,
  generateSecret,
  isInTeamScope,
} from './managed-secret';

describe('generateSecret', () => {
  it('prefixes and produces a long random hex secret', () => {
    const s = generateSecret('insec_');
    expect(s).toMatch(/^insec_[0-9a-f]{48}$/);
    expect(generateSecret('insec_')).not.toBe(s);
  });
});

describe('encrypt/decrypt passthrough', () => {
  it('passes through when no crypto is wired', () => {
    expect(encryptSecret(undefined, 'raw')).toBe('raw');
    expect(decryptSecret(undefined, 'raw')).toBe('raw');
  });

  it('delegates to the crypto service when a key is active', () => {
    const crypto = {
      isEnabled: () => true,
      encrypt: vi.fn().mockReturnValue('enc'),
      decrypt: vi.fn().mockReturnValue('dec'),
    };
    expect(encryptSecret(crypto as never, 'raw')).toBe('enc');
    expect(decryptSecret(crypto as never, 'enc')).toBe('dec');
  });

  it('stores raw (no encrypt) when crypto is present but keyless', () => {
    const crypto = { isEnabled: () => false, encrypt: vi.fn(), decrypt: vi.fn() };
    expect(encryptSecret(crypto as never, 'raw')).toBe('raw');
    expect(crypto.encrypt).not.toHaveBeenCalled();
  });
});

describe('assertTeamAdmin', () => {
  const forbidden = () => new Error('nope');

  it('allows any action with no team context (single-user)', () => {
    expect(() => assertTeamAdmin(undefined, null, null, forbidden)).not.toThrow();
  });

  it('allows admin/owner, rejects member/none', () => {
    const teams = { getMembership: vi.fn() };
    teams.getMembership.mockReturnValue('admin');
    expect(() => assertTeamAdmin(teams as never, 't', 'u', forbidden)).not.toThrow();
    teams.getMembership.mockReturnValue('owner');
    expect(() => assertTeamAdmin(teams as never, 't', 'u', forbidden)).not.toThrow();
    teams.getMembership.mockReturnValue('member');
    expect(() => assertTeamAdmin(teams as never, 't', 'u', forbidden)).toThrow('nope');
    teams.getMembership.mockReturnValue(null);
    expect(() => assertTeamAdmin(teams as never, 't', 'u', forbidden)).toThrow('nope');
  });
});

describe('isInTeamScope', () => {
  it('matches null↔undefined as the single-user scope', () => {
    expect(isInTeamScope(null, undefined)).toBe(true);
    expect(isInTeamScope(undefined, null)).toBe(true);
    expect(isInTeamScope('t', 't')).toBe(true);
    expect(isInTeamScope('t', 'other')).toBe(false);
    expect(isInTeamScope('t', null)).toBe(false);
  });
});
