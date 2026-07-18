import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { LoginProvider } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { userIdentities, type UserIdentityInsert, type UserIdentityRow } from '../db/schema';

/**
 * Phase 70 B — Drizzle-only access to the `user_identities` table (the SSO
 * identity ↔ user link). No business rules live here: the lookup/link/provision
 * policy is `UsersService.findOrCreateFromSso`. Physically under `auth/` (SSO is
 * an auth concern; Theme C's nonce store lands alongside it) but registered by
 * `UsersModule` so `UsersService` can inject it — it depends only on the global
 * `DB_TOKEN`, so no Auth↔Users module cycle is introduced.
 */
@Injectable()
export class UserIdentitiesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  /** The identity key: a provider + its stable subject id uniquely names one login. */
  findByProviderIdentity(provider: LoginProvider, providerUserId: string): UserIdentityRow | undefined {
    return this.db
      .select()
      .from(userIdentities)
      .where(
        and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, providerUserId)),
      )
      .get();
  }

  insertIdentity(row: UserIdentityInsert): UserIdentityRow {
    return this.db.insert(userIdentities).values(row).returning().get();
  }

  /** Every linked identity for a user, oldest first — backs the Settings "linked accounts" list. */
  listForUser(userId: string): UserIdentityRow[] {
    return this.db
      .select()
      .from(userIdentities)
      .where(eq(userIdentities.userId, userId))
      .all();
  }
}
