import { Injectable } from '@nestjs/common';
import type { TeamRole } from '@midnite/shared';

/**
 * Ownership resolution helper (Phase 35 B3). Keeps the "own vs others' item"
 * distinction out of controllers — used in service update paths where the required
 * role differs based on whether the requesting user created the resource.
 */
@Injectable()
export class OwnershipService {
  /** True if the requesting user created the entity (or it has no owner — legacy). */
  isOwner(entityCreatedBy: string | null | undefined, userId: string): boolean {
    return !entityCreatedBy || entityCreatedBy === userId;
  }

  /**
   * Promotes baseRole to 'admin' when the entity was created by someone else.
   * Mutating your own resource requires `baseRole`; mutating another member's
   * resource requires at least `admin`.
   */
  resolveRequiredRole(
    entityCreatedBy: string | null | undefined,
    requestingUserId: string,
    baseRole: TeamRole,
  ): TeamRole {
    return this.isOwner(entityCreatedBy, requestingUserId) ? baseRole : 'admin';
  }
}
