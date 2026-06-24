import { SetMetadata } from '@nestjs/common';
import type { TeamRole } from '@midnite/shared';

export const REQUIRE_ROLE_KEY = 'requireRole';

/** Mark a route as requiring at least `minRole` in the resource's team.
 *  Consumed by RoleGuard. Routes without this decorator are unaffected. */
export const RequiresRole = (minRole: TeamRole) => SetMetadata(REQUIRE_ROLE_KEY, minRole);
