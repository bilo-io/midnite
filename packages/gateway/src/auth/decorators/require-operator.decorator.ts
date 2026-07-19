import { SetMetadata } from '@nestjs/common';

export const REQUIRE_OPERATOR_KEY = 'requireOperator';

/**
 * Mark a route as requiring a **platform operator** (Phase 73 D) — an email in
 * `gateway.auth.operators`. Consumed by {@link OperatorGuard}. Routes without this
 * decorator are unaffected (the guard returns true immediately). Distinct from
 * `@RequiresRole`, which gates by *team* role; this is the cross-tenant operator gate.
 */
export const RequiresOperator = () => SetMetadata(REQUIRE_OPERATOR_KEY, true);
