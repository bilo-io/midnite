import { eq, isNull, or } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';
import type { TeamScope } from '@midnite/shared';

/** Builds a WHERE clause fragment restricting rows to the requesting user's scope.
 *  User sees their own rows + rows scoped to their current team.
 *  Rows with null created_by (legacy single-user data) remain globally visible.
 *  Pass `undefined` scope → no filter (backward compat for static-token/anon paths). */
export function teamScopeFilter(
  createdByCol: Column,
  teamIdCol: Column,
  scope: TeamScope,
) {
  const ownRow = eq(createdByCol, scope.userId);
  const legacyRow = isNull(createdByCol);
  if (scope.teamId) {
    return or(ownRow, legacyRow, eq(teamIdCol, scope.teamId));
  }
  return or(ownRow, legacyRow);
}
