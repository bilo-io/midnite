import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { LoginProvider, MidniteConfig, SsoIdentity, User } from '@midnite/shared';
import { AuditService } from '../audit/audit.service';
import { UserIdentitiesRepository } from '../auth/user-identities.repository';
import { MIDNITE_CONFIG } from '../config.token';
import type { UserRow } from '../db/schema';
import { TeamsService } from '../teams/teams.service';
import { UsersRepository } from './users.repository';

const BCRYPT_ROUNDS = 12;

/**
 * Phase 70 B — the identity a provider hands back after a successful SSO login,
 * normalized for `findOrCreateFromSso`. `emailVerified` is the provider's own
 * verification flag (Google `email_verified`, GitHub primary+verified email); it
 * gates auto-linking — an unverified email must never silently take over an
 * existing account.
 */
export type SsoProfile = {
  provider: LoginProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  /** Provider profile picture (Google `picture` / GitHub `avatar_url`), if any —
   *  persisted on the user and refreshed on each SSO login (Phase 71). */
  avatarUrl?: string;
};

export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`user with email ${email} already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserDoesNotExistError extends Error {
  constructor(id: string) {
    super(`user ${id} not found`);
    this.name = 'UserDoesNotExistError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * Thrown when someone tries to *password*-login to a pure-SSO account (null
 * password hash). Distinct from InvalidCredentialsError so the controller can
 * answer with a helpful "use Google/GitHub" message instead of a generic
 * failure — the email is already known to be registered, so there's no
 * enumeration to protect here; the leak we avoid is confusing a real SSO user.
 */
export class PasswordLoginUnavailableError extends Error {
  constructor() {
    super('this account signs in with Google or GitHub — use that provider');
    this.name = 'PasswordLoginUnavailableError';
  }
}

/**
 * Thrown when an SSO login's email matches an existing account but we could not
 * safely auto-link (the provider did not verify the email). We refuse to both
 * silently take over the account *and* to provision a duplicate (the email is
 * unique) — the user must sign in with their existing method, or use a provider
 * that verifies the address. Theme C maps it to a clear redirect.
 */
export class SsoEmailConflictError extends Error {
  constructor(email: string) {
    super(`an account already exists for ${email} — sign in with your existing method`);
    this.name = 'SsoEmailConflictError';
  }
}

/**
 * Thrown by findOrCreateFromSso when a brand-new person signs in via SSO but the
 * deployment has open signup turned off. Existing users (by identity or verified-
 * email link) still sign in; only first-time provisioning is gated — mirroring
 * how POST /auth/register is gated (Decision §4). Theme C maps it to a friendly
 * "signups are closed" redirect.
 */
export class SsoSignupClosedError extends Error {
  constructor(provider: LoginProvider) {
    super(`signups are closed — cannot provision a new ${provider} account`);
    this.name = 'SsoSignupClosedError';
  }
}

/**
 * Thrown when an email is not on the configured access allowlist
 * (`gateway.auth.allowlist`). Gates password login, registration, and SSO
 * provisioning alike (Phase 71) so a locked-down deployment admits only known
 * addresses. Only fires when the allowlist is non-empty.
 */
export class EmailNotAllowlistedError extends Error {
  constructor(email: string) {
    super(`${email} is not permitted to access this instance`);
    this.name = 'EmailNotAllowlistedError';
  }
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  /** Lower-cased access allowlist; empty ⇒ no restriction (Phase 71). */
  private readonly allowlist: ReadonlySet<string>;

  constructor(
    private readonly repo: UsersRepository,
    // Optional: absent in unit tests that don't wire the full module graph.
    @Optional() private readonly teams?: TeamsService,
    @Optional() private readonly audit?: AuditService,
    // Phase 70 B — required in the real module (UsersModule registers it); optional
    // so pre-SSO unit tests that `new UsersService(repo)` still construct. The SSO
    // methods guard on its presence.
    @Optional() private readonly identities?: UserIdentitiesRepository,
    // Phase 71 — access allowlist source. Optional so unit tests that construct
    // the service by hand (no config) impose no restriction.
    @Optional() @Inject(MIDNITE_CONFIG) config?: MidniteConfig,
  ) {
    this.allowlist = new Set(
      (config?.gateway.auth.allowlist ?? []).map((e) => e.toLowerCase()),
    );
  }

  /**
   * Refuse an email that isn't on a non-empty allowlist. A no-op when the
   * allowlist is empty (the default), so open deployments are unaffected.
   */
  private assertAllowlisted(email: string): void {
    if (this.allowlist.size === 0) return;
    if (!this.allowlist.has(email.toLowerCase())) throw new EmailNotAllowlistedError(email);
  }

  async register(email: string, name: string, password: string): Promise<User> {
    const normalizedEmail = email.toLowerCase();
    this.assertAllowlisted(normalizedEmail);
    const existing = this.repo.findByEmail(normalizedEmail);
    if (existing) throw new UserAlreadyExistsError(email);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const row = this.provisionUserWithTeam({ email: normalizedEmail, name: name.trim(), passwordHash });
    return this.repo.hydrate(row);
  }

  /**
   * Phase 70 B — the shared user+team bootstrap behind *both* password
   * registration and first-time SSO provisioning. Inserts the user row (the
   * password hash may be null for a pure-SSO user) and, when TeamsService is
   * wired, auto-creates the user's personal workspace team (Phase 33 C2) — the
   * single source of truth for the bootstrap so the two entry points can't
   * drift. Callers own the "does this email already exist?" check.
   */
  private provisionUserWithTeam(input: {
    email: string;
    name: string;
    passwordHash: string | null;
    avatarUrl?: string;
  }): UserRow {
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id: randomUUID(),
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      avatarUrl: input.avatarUrl ?? null,
      createdAt: now,
      updatedAt: now,
    });
    this.logger.log(`user provisioned: ${row.id}`);
    this.audit?.record({ entityType: 'user', entityId: row.id, userId: row.id, action: 'user.registered' });

    // Slug is `personal-<userId>` — guaranteed unique since user IDs are UUIDs.
    if (this.teams) {
      this.teams.createTeam(
        { slug: `personal-${row.id}`, name: `${input.name}'s workspace` },
        row.id,
      );
    }
    return row;
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    this.assertAllowlisted(email);
    const row = this.repo.findByEmail(email.toLowerCase());
    if (!row) throw new InvalidCredentialsError();
    // A pure-SSO user has no password hash: reject with a distinct, helpful error
    // rather than bcrypt-comparing against null (which would throw opaquely).
    if (row.passwordHash === null) throw new PasswordLoginUnavailableError();
    const match = await bcrypt.compare(password, row.passwordHash);
    if (!match) throw new InvalidCredentialsError();
    return this.repo.hydrate(row);
  }

  /**
   * Phase 70 B — resolve or provision the user behind a successful SSO login,
   * then return the same public `User` shape a password login yields (Theme C
   * issues our JWTs over it). Order:
   *   1. Known identity `(provider, providerUserId)` → that user.
   *   2. Provider-*verified* email matching an existing user → auto-link the new
   *      identity to that account (Decision §1). Unverified emails never link.
   *   3. Otherwise provision a fresh user (+ team, null password), gated by the
   *      open-signup policy (Decision §4) — else `SsoSignupClosedError`.
   */
  async findOrCreateFromSso(profile: SsoProfile, opts: { signupOpen: boolean }): Promise<User> {
    if (!this.identities) throw new Error('UserIdentitiesRepository is not wired');
    // Allowlist gates SSO too — a permitted provider identity is still refused if
    // its email isn't allowed (checked before any find/link/provision).
    this.assertAllowlisted(profile.email);

    // (1) Known identity → its user.
    const linked = this.identities.findByProviderIdentity(profile.provider, profile.providerUserId);
    if (linked) {
      const row = this.repo.findById(linked.userId);
      if (!row) throw new UserDoesNotExistError(linked.userId);
      return this.repo.hydrate(this.syncAvatar(row, profile));
    }

    const normalizedEmail = profile.email.toLowerCase();

    // (2) Auto-link on a provider-verified email that matches an existing user.
    if (profile.emailVerified) {
      const byEmail = this.repo.findByEmail(normalizedEmail);
      if (byEmail) {
        this.linkIdentity(byEmail.id, profile, normalizedEmail);
        return this.repo.hydrate(this.syncAvatar(byEmail, profile));
      }
    }

    // (3) Brand-new person → provision, gated by the signup policy.
    if (!opts.signupOpen) throw new SsoSignupClosedError(profile.provider);
    // An email that reaches here but already belongs to an account is an
    // *unverified* collision (a verified match would have linked in step 2): we
    // can neither take it over nor duplicate the unique email, so we reject.
    if (this.repo.findByEmail(normalizedEmail)) throw new SsoEmailConflictError(normalizedEmail);
    const name = profile.name?.trim() || normalizedEmail.split('@')[0] || normalizedEmail;
    const row = this.provisionUserWithTeam({
      email: normalizedEmail,
      name,
      passwordHash: null,
      avatarUrl: profile.avatarUrl,
    });
    this.linkIdentity(row.id, profile, normalizedEmail);
    return this.repo.hydrate(row);
  }

  /** Refresh a returning SSO user's avatar to the provider's current picture, so
   *  a changed profile photo propagates on next login. No-op when the provider
   *  gave no picture or it already matches. Returns the (possibly updated) row. */
  private syncAvatar(row: UserRow, profile: SsoProfile): UserRow {
    if (!profile.avatarUrl || profile.avatarUrl === row.avatarUrl) return row;
    this.repo.updateAvatar(row.id, profile.avatarUrl);
    return { ...row, avatarUrl: profile.avatarUrl };
  }

  /** Linked SSO identities for a user (Settings "linked accounts"). Rows without a
   *  stored email are dropped — SsoIdentity requires a valid address. */
  listIdentities(userId: string): SsoIdentity[] {
    if (!this.identities) return [];
    return this.identities
      .listForUser(userId)
      .filter((r): r is typeof r & { email: string } => r.email !== null && r.email.length > 0)
      .map((r) => ({ provider: r.provider as LoginProvider, email: r.email }));
  }

  private linkIdentity(userId: string, profile: SsoProfile, email: string): void {
    this.identities!.insertIdentity({
      id: randomUUID(),
      userId,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      email,
      createdAt: new Date().toISOString(),
    });
    this.audit?.record({
      entityType: 'user',
      entityId: userId,
      userId,
      action: 'user.sso_linked',
      payload: { provider: profile.provider },
    });
  }

  getUser(id: string): User {
    const row = this.repo.findById(id);
    if (!row) throw new UserDoesNotExistError(id);
    return this.repo.hydrate(row);
  }

  async updateProfile(id: string, name?: string): Promise<User> {
    const row = this.repo.updateProfile(id, { name, updatedAt: new Date().toISOString() });
    if (!row) throw new UserDoesNotExistError(id);
    return this.repo.hydrate(row);
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const row = this.repo.findById(id);
    if (!row) throw new UserDoesNotExistError(id);
    // A pure-SSO user has no current password to verify against.
    if (row.passwordHash === null) throw new PasswordLoginUnavailableError();
    const match = await bcrypt.compare(currentPassword, row.passwordHash);
    if (!match) throw new InvalidCredentialsError();
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    this.repo.updatePassword(id, hash, new Date().toISOString());
  }
}
