import { z } from 'zod';

/**
 * SSO login providers (Phase 70). Deliberately **distinct** from the
 * credential-vault `OAuthProvider` (`google | slack`) in
 * [`workflow-credential.ts`](./workflow-credential.ts) — that enum names the
 * services a workflow can hold vault tokens for; this one names the identity
 * providers a *user* can log in with. Keeping them separate stops us implying
 * combinations (GitHub-vault, Slack-login) that don't exist.
 */
export const LOGIN_PROVIDERS = ['google', 'github'] as const;
export const LoginProviderSchema = z.enum(LOGIN_PROVIDERS);
export type LoginProvider = z.infer<typeof LoginProviderSchema>;

/** A third-party identity linked to a user, surfaced to the UI (Settings shows
 *  "Google (a@x.com)"). The `email` is the address the provider authenticated. */
export const SsoIdentitySchema = z.object({
  provider: LoginProviderSchema,
  email: z.string().email(),
});

export type SsoIdentity = z.infer<typeof SsoIdentitySchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Avatar image URL (Phase 71). Populated from the SSO provider's profile
   *  picture (Google `picture` / GitHub `avatar_url`) when available; absent for
   *  password-only users, whose UI falls back to initials. Optional so existing
   *  `UserSchema.parse` callers (and pre-avatar rows) stay valid. */
  avatarUrl: z.string().url().optional(),
  /** Linked SSO identities (Phase 70). Optional so existing `UserSchema.parse`
   *  callers (and pre-SSO rows) stay valid; absent means none/unknown. */
  identities: z.array(SsoIdentitySchema).optional(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserRequestSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(256),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

export const UpdatePasswordRequestSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(256),
});

export type UpdatePasswordRequest = z.infer<typeof UpdatePasswordRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

// --- SSO (Phase 70 Theme A) ------------------------------------------------

/**
 * A same-origin relative return path (e.g. `/board`) for post-login redirect.
 * The open-redirect guard lives here in the contract: must start with a single
 * `/` (not `//`, which is protocol-relative) and carry no scheme — so a caller
 * can't smuggle an absolute URL through `?redirect=`.
 */
export const SsoRedirectPathSchema = z
  .string()
  .max(2048)
  .refine(
    (v) => v.startsWith('/') && !v.startsWith('//') && !v.includes('://') && !v.includes('\\'),
    { message: 'redirect must be a same-origin relative path (e.g. "/board")' },
  );

/** Query params for `GET /auth/sso/:provider/start` — the optional deep-link to
 *  return to after a successful login (defaults to "/" on the web side). */
export const SsoStartParamsSchema = z.object({
  redirect: SsoRedirectPathSchema.optional(),
});

export type SsoStartParams = z.infer<typeof SsoStartParamsSchema>;

/** Body for `POST /auth/sso/exchange` — the short-lived, single-use code the
 *  gateway hands the web callback (Decision §3: no tokens in the URL). The web
 *  route exchanges it server-side for an `AuthResponse`. */
export const SsoExchangeRequestSchema = z.object({
  code: z.string().min(1).max(512),
});

export type SsoExchangeRequest = z.infer<typeof SsoExchangeRequestSchema>;

/** Response for `GET /auth/sso/providers` — which providers the gateway is
 *  actually configured for, so the web login page renders only usable buttons
 *  instead of trusting a build-time env flag. */
export const SsoProvidersResponseSchema = z.object({
  providers: z.array(LoginProviderSchema),
});

export type SsoProvidersResponse = z.infer<typeof SsoProvidersResponseSchema>;
