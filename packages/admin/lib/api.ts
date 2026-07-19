import {
  AdminUserSummarySchema,
  AdminTeamSummarySchema,
  PlatformOverviewSchema,
  LoginProviderSchema,
  UserSchema,
  UsageSummaryResponseSchema,
  UsageAttributionResponseSchema,
  OpsSummarySchema,
  CycleTimeResponseSchema,
  AuditListResponseSchema,
  ProjectSchema,
  ProjectsPageSchema,
  VersionManifestSchema,
  versionManifestFile,
  PUBLIC_GITHUB_REPO,
  TeamSchema,
  TeamWithMembersSchema,
  type AdminUserSummary,
  type AdminTeamSummary,
  type PlatformOverview,
  type LoginProvider,
  type User,
  type UsageSummaryResponse,
  type UsageAttributionResponse,
  type UsageGroupBy,
  type UsageAttributionGroupBy,
  type OpsSummary,
  type CycleTimeResponse,
  type AuditListResponse,
  type AuditEntityType,
  type AuditAction,
  type Project,
  type ProjectsPage,
  type VersionManifest,
  type UpdateChannel,
  type Team,
  type TeamWithMembers,
  type TeamRole,
} from '@midnite/shared';
import { z } from 'zod';

// Admin is a pure HTTP client of the gateway (like web) — it never imports gateway
// internals; every shape is a `@midnite/shared` zod schema. This is the MINIMAL
// surface the operator console needs: the auth reads (session + SSO), and the
// operator-gated `/admin/*` reads.

let _accessToken: string | null = null;

/** Set the JWT access token used for all authenticated gateway requests. */
export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

/** Get the current access token (for use in direct fetch calls). */
export function getAccessToken(): string | null {
  return _accessToken;
}

/** The gateway origin. Overridable at build/runtime via `NEXT_PUBLIC_GATEWAY_URL`. */
export function gatewayUrl(): string {
  if (typeof window === 'undefined') {
    return process.env['NEXT_PUBLIC_GATEWAY_URL'] ?? 'http://localhost:7777';
  }
  return (
    (window as unknown as { __NEXT_PUBLIC_GATEWAY_URL?: string }).__NEXT_PUBLIC_GATEWAY_URL ??
    process.env['NEXT_PUBLIC_GATEWAY_URL'] ??
    'http://localhost:7777'
  );
}

/**
 * A failed gateway request. Carries the HTTP `status` so callers can branch on it
 * (the operator gate maps 403 → not-operator); `message` is the gateway error.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  schema?: { parse: (value: unknown) => T },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (_accessToken) headers['authorization'] = `Bearer ${_accessToken}`;
  const extra = init?.headers as Record<string, string> | undefined;
  if (extra) Object.assign(headers, extra);
  // `credentials: 'include'` sends the gateway's SSO refresh cookie cross-origin
  // (admin is a static app on its own origin) so `/auth/me` can restore a session.
  const res = await fetch(`${gatewayUrl()}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    ...init,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(errorMessage(res, text), res.status);
  }
  // 204 No Content (e.g. team/member DELETE) carries no body — never call json().
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as unknown;
  return schema ? schema.parse(body) : (body as T);
}

/** Turn a failed Nest response (`{ statusCode, message, error }`) into readable text. */
function errorMessage(res: Response, text: string): string {
  if (text) {
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
      if (Array.isArray(parsed.message) && parsed.message.length > 0) return parsed.message.join(', ');
    } catch {
      // Not JSON — fall through to the raw text below.
    }
    return text;
  }
  return `${res.status} ${res.statusText}`;
}

// ── Auth ────────────────────────────────────────────────────────────────────

/** The authenticated user (`GET /auth/me`). Throws `ApiError` (401 when signed out). */
export async function getCurrentUser(): Promise<User> {
  const data = await fetchJson('/auth/me', undefined, z.object({ user: UserSchema }));
  return data.user;
}

/**
 * Browser URL that starts the Google/GitHub login flow — navigate the browser here
 * (an anchor). The gateway 302s to the provider consent screen, then back to the
 * callback. `redirect` is the same-origin path to land on after login.
 */
export function ssoStartUrl(provider: LoginProvider, redirect?: string): string {
  const qs = redirect ? `?${new URLSearchParams({ redirect }).toString()}` : '';
  return `${gatewayUrl()}/auth/sso/${encodeURIComponent(provider)}/start${qs}`;
}

/**
 * Which SSO providers the gateway is configured for (`GET /auth/sso/providers`).
 * Returns `[]` on any failure so the login screen simply shows the fallback set.
 */
export async function fetchSsoProviders(): Promise<LoginProvider[]> {
  try {
    const res = await fetch(`${gatewayUrl()}/auth/sso/providers`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { providers?: unknown };
    const parsed = LoginProviderSchema.array().safeParse(data.providers);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

// ── Operator-gated reads (`GET /admin/*`, `@RequiresOperator` → 403) ──────────

/** The result of probing the operator-gated surface (see `probeOperator`). */
export type OperatorProbe = 'operator' | 'forbidden' | 'unknown';

/**
 * Probe the operator-gated `GET /admin/overview` to classify the current session:
 *  - HTTP 200 → the account is an operator;
 *  - HTTP 403 → authenticated but not an operator;
 *  - anything else / network error → unknown (caller treats as loading/retry).
 * This is the thin seam wired to Theme D's `@RequiresOperator` gate — there is no
 * `isOperator` field on `/auth/me`, so access itself is the signal.
 */
export async function probeOperator(signal?: AbortSignal): Promise<OperatorProbe> {
  try {
    const headers: Record<string, string> = {};
    if (_accessToken) headers['authorization'] = `Bearer ${_accessToken}`;
    const res = await fetch(`${gatewayUrl()}/admin/overview`, {
      cache: 'no-store',
      credentials: 'include',
      signal,
      headers,
    });
    if (res.ok) return 'operator';
    if (res.status === 403) return 'forbidden';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Platform KPIs for the Overview page (`GET /admin/overview`). Operator-only. */
export async function getAdminOverview(signal?: AbortSignal): Promise<PlatformOverview> {
  return fetchJson('/admin/overview', { signal }, PlatformOverviewSchema);
}

/** Every user on the platform (`GET /admin/users`). Operator-only, cross-tenant. */
export async function getAdminUsers(signal?: AbortSignal): Promise<AdminUserSummary[]> {
  return fetchJson('/admin/users', { signal }, z.array(AdminUserSummarySchema));
}

/** Every team on the platform (`GET /admin/teams`). Operator-only, cross-tenant. */
export async function getAdminTeams(signal?: AbortSignal): Promise<AdminTeamSummary[]> {
  return fetchJson('/admin/teams', { signal }, z.array(AdminTeamSummarySchema));
}

// ── Usage & cost (`GET /usage/*`, Phase 61) ───────────────────────────────────

/** Build a query string, dropping undefined values. */
function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** LLM-call usage summary over a window, grouped by day/provider/feature. */
export async function getUsageSummary(
  params: { from?: string; to?: string; groupBy?: UsageGroupBy },
  signal?: AbortSignal,
): Promise<UsageSummaryResponse> {
  return fetchJson(`/usage/summary${qs(params)}`, { signal }, UsageSummaryResponseSchema);
}

/** Agent-session cost attribution, grouped by task/repo/project/session. */
export async function getUsageAttribution(
  params: { from?: string; to?: string; groupBy?: UsageAttributionGroupBy },
  signal?: AbortSignal,
): Promise<UsageAttributionResponse> {
  return fetchJson(`/usage/attribution${qs(params)}`, { signal }, UsageAttributionResponseSchema);
}

// ── Ops metrics (`GET /metrics/*`, Phase 22/61) ───────────────────────────────

/** Ops summary: live gauges + throughput/duration/outcome aggregates. */
export async function getOpsSummary(
  params: { from?: string; to?: string },
  signal?: AbortSignal,
): Promise<OpsSummary> {
  return fetchJson(`/metrics/ops${qs(params)}`, { signal }, OpsSummarySchema);
}

/** Cycle-time percentiles (wait/work/end-to-end) over a trailing window. */
export async function getCycleTime(
  params: { windowDays?: number; groupBy?: string },
  signal?: AbortSignal,
): Promise<CycleTimeResponse> {
  return fetchJson(`/metrics/cycle-time${qs(params)}`, { signal }, CycleTimeResponseSchema);
}

// ── Audit log (`GET /audit`) ──────────────────────────────────────────────────

export type AuditFilters = {
  entityType?: AuditEntityType;
  userId?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

/** Paginated, filterable audit log. */
export async function getAudit(filters: AuditFilters, signal?: AbortSignal): Promise<AuditListResponse> {
  return fetchJson(`/audit${qs(filters)}`, { signal }, AuditListResponseSchema);
}

// ── Teams CRUD (`/teams…`, Phase 33/35) ───────────────────────────────────────
// The operator console reuses the standard team endpoints for writes; membership
// reads use `GET /teams/:id` (full members), which `/admin/teams` (summary) omits.

/** Full team detail incl. members + roles (`GET /teams/:id`). */
export async function getTeamDetail(id: string, signal?: AbortSignal): Promise<TeamWithMembers> {
  return fetchJson(`/teams/${encodeURIComponent(id)}`, { signal }, TeamWithMembersSchema);
}

/** Create a team (`POST /teams`). */
export async function createTeam(body: { name: string; slug: string }): Promise<Team> {
  return fetchJson(
    '/teams',
    { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } },
    TeamSchema,
  );
}

/** Rename a team (`PATCH /teams/:id`). */
export async function updateTeam(id: string, body: { name: string }): Promise<Team> {
  return fetchJson(
    `/teams/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } },
    TeamSchema,
  );
}

/** Delete a team (`DELETE /teams/:id`, 204). */
export async function deleteTeam(id: string): Promise<void> {
  await fetchJson(`/teams/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Change a member's role (`PATCH /teams/:id/members/:userId/role`). */
export async function setMemberRole(teamId: string, userId: string, role: TeamRole): Promise<void> {
  await fetchJson(
    `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}/role`,
    { method: 'PATCH', body: JSON.stringify({ role }), headers: { 'content-type': 'application/json' } },
  );
}

/** Remove a member from a team (`DELETE /teams/:id/members/:userId`, 204). */
export async function removeMember(teamId: string, userId: string): Promise<void> {
  await fetchJson(
    `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
}

// ── Projects (`GET /projects`, `GET /projects/:id`, Phase 55/57) ──────────────
// Read-only for the operator console: the registry list + a per-project drill-in.

/** A page of projects (`GET /projects` → `{ items, total }`). */
export async function getProjects(signal?: AbortSignal): Promise<ProjectsPage> {
  return fetchJson('/projects', { signal }, ProjectsPageSchema);
}

/** A single project's full detail (`GET /projects/:id` → the bare `Project`). */
export async function getProjectDetail(id: string, signal?: AbortSignal): Promise<Project> {
  return fetchJson(`/projects/${encodeURIComponent(id)}`, { signal }, ProjectSchema);
}

// ── Version manifests (public GitHub-raw, cross-origin) ────────────────────────
// The release flow publishes `version.json` / `version.beta.json` to the web origin
// AND mirrors them into the PUBLIC companion repo (`sync-public-assets.yml`). Admin
// is a static app on its own origin, so it can't reach web's same-origin manifest —
// it reads the mirrored copies over `raw.githubusercontent.com`, which serves them
// anonymously with an open CORS header (same trick the CHANGELOG fetch uses). No
// gateway, no credentials — a plain cross-origin fetch.

/** The public GitHub-raw URL for a channel's mirrored version manifest. */
export function versionManifestUrl(channel: UpdateChannel): string {
  return `https://raw.githubusercontent.com/${PUBLIC_GITHUB_REPO}/main/packages/web/public/${versionManifestFile(channel)}`;
}

/**
 * Fetch + validate a channel's published version manifest from the public mirror.
 * Cache-busted so a CDN can't pin a stale "latest". Throws on a network error, a
 * 404 (e.g. `beta` not yet published), or a malformed manifest — callers fail soft.
 */
export async function fetchVersionManifest(
  channel: UpdateChannel,
  signal?: AbortSignal,
): Promise<VersionManifest> {
  const bust = `_=${encodeURIComponent(String(Date.now()))}`;
  const res = await fetch(`${versionManifestUrl(channel)}?${bust}`, { cache: 'no-store', signal });
  if (!res.ok) {
    throw new ApiError(`version manifest (${channel}) fetch failed`, res.status);
  }
  return VersionManifestSchema.parse(await res.json());
}
