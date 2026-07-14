import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_USER_PREFERENCES } from '@midnite/shared';
import { PreferencesController } from './preferences.controller';
import type { PreferencesService } from './preferences.service';

const AUTHED = { userId: 'u1', email: 'a@b.c' } as never;

function makeService() {
  return { get: vi.fn(), save: vi.fn() };
}

let svc: ReturnType<typeof makeService>;
let controller: PreferencesController;

beforeEach(() => {
  svc = makeService();
  controller = new PreferencesController(svc as unknown as PreferencesService);
});

describe('PreferencesController.get', () => {
  it('401s when unauthenticated', () => {
    expect(() => controller.get(null)).toThrow(UnauthorizedException);
    expect(svc.get).not.toHaveBeenCalled();
  });

  it('returns the service result for the current user', () => {
    svc.get.mockReturnValue({ preferences: DEFAULT_USER_PREFERENCES, updatedAt: null });
    expect(controller.get(AUTHED)).toEqual({ preferences: DEFAULT_USER_PREFERENCES, updatedAt: null });
    expect(svc.get).toHaveBeenCalledWith('u1');
  });
});

describe('PreferencesController.put', () => {
  it('401s when unauthenticated', () => {
    expect(() => controller.put(null, DEFAULT_USER_PREFERENCES)).toThrow(UnauthorizedException);
  });

  it('400s on an invalid body', () => {
    expect(() => controller.put(AUTHED, { accent: 'chartreuse' })).toThrow(BadRequestException);
    expect(svc.save).not.toHaveBeenCalled();
  });

  it('saves a valid body and returns the result', () => {
    const roseSolid = { kind: 'solid' as const, swatch: 'rose' as const };
    const saved = { preferences: { ...DEFAULT_USER_PREFERENCES, accent: roseSolid }, updatedAt: '2026-06-30T10:00:00.000Z' };
    svc.save.mockReturnValue(saved);
    // A legacy string accent in the body is coerced to the solid model before save (Phase 68).
    expect(controller.put(AUTHED, { ...DEFAULT_USER_PREFERENCES, accent: 'rose' })).toEqual(saved);
    expect(svc.save).toHaveBeenCalledWith('u1', expect.objectContaining({ accent: roseSolid }));
  });
});
