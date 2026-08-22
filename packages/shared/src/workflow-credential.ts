import { z } from 'zod';

// Credential kinds an integration/HTTP node can reference. The secret payload shape
// is keyed off this discriminant (see WorkflowCredentialDataSchema). Adding a kind is
// one entry here + one branch below + (later) the executor that consumes it.
export const WORKFLOW_CREDENTIAL_TYPES = [
  'http-bearer',
  'http-basic',
  'http-header',
  'slack',
  'smtp',
  'github',
  'google-oauth',
  'slack-oauth',
  // A per-user GitHub **connection** (Phase 84 Theme A) — distinct from the opaque
  // install-wide `github` PAT above, which stays and keeps working untouched.
  'github-oauth',
] as const;
export const WorkflowCredentialTypeSchema = z.enum(WORKFLOW_CREDENTIAL_TYPES);
export type WorkflowCredentialType = z.infer<typeof WorkflowCredentialTypeSchema>;

// The secret material, one shape per type. Stored AES-256-GCM-encrypted at rest and
// resolved server-side at node-run time — **never** serialised back to a client. The
// `type` discriminant doubles as the credential's stored type, so it has one home.
export const WorkflowCredentialDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('http-bearer'), token: z.string().min(1) }),
  z.object({
    type: z.literal('http-basic'),
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  z.object({
    type: z.literal('http-header'),
    header: z.string().min(1),
    value: z.string().min(1),
  }),
  z.object({ type: z.literal('slack'), token: z.string().min(1) }),
  z.object({
    type: z.literal('github'),
    token: z.string().min(1),
    enterpriseUrl: z.string().url().optional(),
  }),
  z.object({
    type: z.literal('smtp'),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    username: z.string().min(1),
    password: z.string().min(1),
    from: z.string().min(1).optional(),
    secure: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('google-oauth'),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresAt: z.string(),
    scope: z.string(),
  }),
  // A per-user GitHub connection from the connect flow (Phase 84 Theme A). GitHub OAuth
  // App tokens do **not** expire unless the app opts into expiring tokens, so both
  // `refreshToken` and `expiresAt` are optional: their absence means "nothing to
  // refresh", which is the normal case rather than a malformed row.
  z.object({
    type: z.literal('github-oauth'),
    accessToken: z.string().min(1),
    refreshToken: z.string().optional(),
    expiresAt: z.string().optional(),
    /** The scope string GitHub actually granted — shown in the UI, not what we asked for. */
    scope: z.string(),
    /** GitHub login of the connected account, for display without an API round-trip. */
    login: z.string().optional(),
  }),
  z.object({
    type: z.literal('slack-oauth'),
    accessToken: z.string().min(1),
    refreshToken: z.string().optional(),
    teamId: z.string().min(1),
    scope: z.string(),
  }),
]);
export type WorkflowCredentialData = z.infer<typeof WorkflowCredentialDataSchema>;

// The public, secret-free view returned over the API — names + types only.
export const WorkflowCredentialSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  type: WorkflowCredentialTypeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkflowCredential = z.infer<typeof WorkflowCredentialSchema>;

// Create carries the secret `data`; the credential's `type` is derived from it so the
// discriminant lives in exactly one place. No update route in this slice — secrets are
// replace-by-delete-and-recreate, which keeps the encrypted blob immutable once written.
export const CreateWorkflowCredentialRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  data: WorkflowCredentialDataSchema,
});
export type CreateWorkflowCredentialRequest = z.infer<
  typeof CreateWorkflowCredentialRequestSchema
>;

export const WorkflowCredentialResponseSchema = z.object({ credential: WorkflowCredentialSchema });
export type WorkflowCredentialResponse = z.infer<typeof WorkflowCredentialResponseSchema>;

export const WorkflowCredentialsResponseSchema = z.object({
  credentials: z.array(WorkflowCredentialSchema),
});
export type WorkflowCredentialsResponse = z.infer<typeof WorkflowCredentialsResponseSchema>;

// OAuth providers supported by the connect flow. `google`/`slack` use the redirect
// grant; `github` prefers the **device** grant so a bare local install needs no client
// secret and no reachable callback (Phase 84 Decision §11).
export const OAUTH_PROVIDERS = ['google', 'slack', 'github'] as const;
export const OAuthProviderSchema = z.enum(OAUTH_PROVIDERS);
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;

// Query params for GET /oauth/:provider/start.
export const OAuthStartParamsSchema = z.object({
  credential_name: z.string().trim().min(1).max(120),
  redirect_uri: z.string().url(),
});
export type OAuthStartParams = z.infer<typeof OAuthStartParamsSchema>;

// --- Device grant (Phase 84 Theme A) ---

/**
 * Which grant a provider's connect flow uses on **this** install. Data rather than a
 * branch in the controller: the redirect grant needs a client secret and a reachable
 * callback, so it's the hosted-operator opt-in, and device is the zero-config default.
 */
export const OAUTH_GRANTS = ['redirect', 'device'] as const;
export const OAuthGrantSchema = z.enum(OAUTH_GRANTS);
export type OAuthGrant = z.infer<typeof OAuthGrantSchema>;

/** `POST /oauth/:provider/device` — start a device authorization. */
export const OAuthDeviceStartResponseSchema = z.object({
  /** Opaque poll handle. Never the provider's own `device_code`. */
  deviceAuthId: z.string(),
  /** The code the user types at `verificationUri`. */
  userCode: z.string(),
  verificationUri: z.string(),
  expiresInSeconds: z.number().int().positive(),
  intervalSeconds: z.number().int().nonnegative(),
});
export type OAuthDeviceStartResponse = z.infer<typeof OAuthDeviceStartResponseSchema>;

/**
 * `POST /oauth/:provider/device/:deviceAuthId` — poll it.
 *
 * `expired` and `denied` are **outcomes, not errors**: the UI offers a retry for each,
 * and modelling them as failures would make a user declining consent look like a bug.
 */
export const OAuthDevicePollResponseSchema = z.object({
  status: z.enum(['pending', 'expired', 'denied', 'complete']),
  /** Present only on `complete` — the secret-free view of the stored credential. */
  credential: WorkflowCredentialSchema.optional(),
});
export type OAuthDevicePollResponse = z.infer<typeof OAuthDevicePollResponseSchema>;

/**
 * What `DELETE /oauth/github/connection` actually managed to do.
 *
 * The local row is always deleted. Revoking **at GitHub** needs Basic auth with the
 * client secret, which the secretless device-flow install by definition doesn't have —
 * so `revokedAtProvider` is honest about it and `manageUrl` points the user at their own
 * app-authorisations page to finish the job.
 */
export const OAuthDisconnectResponseSchema = z.object({
  disconnected: z.boolean(),
  revokedAtProvider: z.boolean(),
  manageUrl: z.string().optional(),
});
export type OAuthDisconnectResponse = z.infer<typeof OAuthDisconnectResponseSchema>;
