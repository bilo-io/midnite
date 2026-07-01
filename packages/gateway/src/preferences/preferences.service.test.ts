import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_USER_PREFERENCES } from '@midnite/shared';
import { PreferencesService } from './preferences.service';
import type { PreferencesRepository } from './preferences.repository';

function makeRepo() {
  return { find: vi.fn(), upsert: vi.fn() };
}

let repo: ReturnType<typeof makeRepo>;
let service: PreferencesService;

beforeEach(() => {
  repo = makeRepo();
  service = new PreferencesService(repo as unknown as PreferencesRepository);
});

describe('PreferencesService.get', () => {
  it('returns defaults with a null updatedAt when the user has no row', () => {
    repo.find.mockReturnValue(undefined);
    expect(service.get('u1')).toEqual({ preferences: DEFAULT_USER_PREFERENCES, updatedAt: null });
  });

  it('re-validates the stored blob: fills missing fields and strips unknown keys', () => {
    repo.find.mockReturnValue({
      userId: 'u1',
      data: JSON.stringify({ accent: 'blue', bogus: 'x' }),
      updatedAt: '2026-06-30T10:00:00.000Z',
    });
    const res = service.get('u1');
    expect(res.preferences.accent).toBe('blue');
    expect(res.preferences.density).toBe('comfortable'); // default filled
    expect(res.preferences).not.toHaveProperty('bogus');
    expect(res.updatedAt).toBe('2026-06-30T10:00:00.000Z');
  });

  it('degrades a corrupt blob to defaults rather than throwing', () => {
    repo.find.mockReturnValue({ userId: 'u1', data: 'not json{', updatedAt: 'x' });
    expect(service.get('u1').preferences).toEqual(DEFAULT_USER_PREFERENCES);
  });
});

describe('PreferencesService.save', () => {
  it('persists a canonical blob, stamps updatedAt, and returns it', () => {
    repo.upsert.mockImplementation((userId: string, data: string, updatedAt: string) => ({
      userId,
      data,
      updatedAt,
    }));
    const res = service.save('u1', { ...DEFAULT_USER_PREFERENCES, accent: 'rose' });

    expect(res.preferences.accent).toBe('rose');
    expect(res.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Stored value is canonical JSON of the parsed prefs.
    const [userId, data, updatedAt] = repo.upsert.mock.calls[0]!;
    expect(userId).toBe('u1');
    expect(JSON.parse(data).accent).toBe('rose');
    expect(updatedAt).toBe(res.updatedAt);
  });

  it('fills defaults from a partial object before persisting', () => {
    repo.upsert.mockReturnValue(undefined);
    // Cast: the controller validates first, but the service must also canonicalise.
    const res = service.save('u1', { accent: 'cyan' } as never);
    expect(res.preferences.density).toBe('comfortable');
    expect(res.preferences.accent).toBe('cyan');
  });
});
