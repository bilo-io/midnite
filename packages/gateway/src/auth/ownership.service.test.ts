import { describe, expect, it } from 'vitest';
import { OwnershipService } from './ownership.service';

describe('OwnershipService', () => {
  const svc = new OwnershipService();

  describe('isOwner', () => {
    it('returns true when createdBy matches the requesting user', () => {
      expect(svc.isOwner('user-a', 'user-a')).toBe(true);
    });

    it('returns false when createdBy is a different user', () => {
      expect(svc.isOwner('user-b', 'user-a')).toBe(false);
    });

    it('returns true when createdBy is null (legacy — no owner, globally visible)', () => {
      expect(svc.isOwner(null, 'user-a')).toBe(true);
    });

    it('returns true when createdBy is undefined', () => {
      expect(svc.isOwner(undefined, 'user-a')).toBe(true);
    });
  });

  describe('resolveRequiredRole', () => {
    it("keeps baseRole when the user owns the entity", () => {
      expect(svc.resolveRequiredRole('user-a', 'user-a', 'member')).toBe('member');
    });

    it("keeps baseRole for legacy null-owner entities", () => {
      expect(svc.resolveRequiredRole(null, 'user-a', 'member')).toBe('member');
    });

    it("promotes to admin when mutating another user's entity", () => {
      expect(svc.resolveRequiredRole('user-b', 'user-a', 'member')).toBe('admin');
    });

    it("promotes even when baseRole is already admin (min admin, stays admin)", () => {
      expect(svc.resolveRequiredRole('user-b', 'user-a', 'admin')).toBe('admin');
    });
  });
});
