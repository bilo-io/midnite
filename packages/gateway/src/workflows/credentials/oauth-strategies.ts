import type { OAuthGrant, OAuthProvider, WorkflowCredentialData } from '@midnite/shared';

// Per-provider OAuth facts as **data** rather than `if google … else slack` branches
// (Phase 84 Theme A). Adding GitHub as a third branch would have made grant selection a
// second axis of branching on top of the first; a table collapses both.
//
// Everything here is deliberately provider-*specific* and provider-*local*: Google wants
// space-separated scopes, `access_type=offline` and `prompt=consent`; Slack wants
// comma-separated scopes and reports failure as `ok: false` on a 200; GitHub returns a
// form-encoded body unless asked otherwise. Those quirks were the reason the branches
// existed, so each keeps its own entry rather than being averaged into a shared default.

/**
 * A provider's token response, narrowed to what we persist. A discriminated result
 * rather than `{ data, error? }` — there is no meaningful credential payload to hand
 * back when the exchange failed, and a placeholder one is a trap waiting to be stored.
 */
export type ParsedToken =
  | { ok: true; data: WorkflowCredentialData }
  | { ok: false; error: string };

export type OAuthStrategy = {
  authUrl: string;
  tokenUrl: string;
  /** How the provider wants its scope list joined. */
  scopeSeparator: string;
  /** Requested when the operator configures no explicit scopes. */
  defaultScopes: string[];
  /** Extra authorize-URL params beyond the common set. */
  extraAuthParams?: Record<string, string>;
  /**
   * Grant this provider's connect flow *prefers*. `device` means a secretless local
   * install can connect with no callback URL; the redirect grant is still used when an
   * operator has configured a client id **and** a reachable secret (see
   * `resolveGrant`).
   */
  preferredGrant: OAuthGrant;
  /** Turn a raw token response into the credential payload to store. */
  parseToken: (body: Record<string, unknown>) => ParsedToken;
};

const GOOGLE_DEFAULT_SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const SLACK_DEFAULT_SCOPES = ['channels:read', 'chat:write'];
/**
 * Scopes the GitHub **connect** flow asks for — one honest consent screen covering
 * private repos, org repos and read/write on Projects v2 (Decision §3). Deliberately
 * *not* the login app's `read:user user:email`: OAuth Apps grant scopes app-wide at
 * first authorization, so widening login's scopes would force every existing user to
 * re-consent at sign-in (Decision §1). Two apps, two scope sets.
 */
export const GITHUB_CONNECT_SCOPES = ['repo', 'project', 'read:org'];

export const OAUTH_STRATEGIES: Record<OAuthProvider, OAuthStrategy> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopeSeparator: ' ',
    defaultScopes: GOOGLE_DEFAULT_SCOPES,
    // `access_type=offline` + `prompt=consent` are what make Google return a refresh
    // token at all; dropping either silently breaks the lazy-refresh path.
    extraAuthParams: { response_type: 'code', access_type: 'offline', prompt: 'consent' },
    preferredGrant: 'redirect',
    parseToken: (body) => {
      const accessToken = str(body['access_token']);
      if (!accessToken) return { ok: false, error: 'no access_token' };
      const expiresIn = num(body['expires_in']) ?? 0;
      return {
        ok: true,
        data: {
          type: 'google-oauth',
          accessToken,
          refreshToken: str(body['refresh_token']) ?? '',
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          scope: str(body['scope']) ?? '',
        },
      };
    },
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopeSeparator: ',',
    defaultScopes: SLACK_DEFAULT_SCOPES,
    preferredGrant: 'redirect',
    parseToken: (body) => {
      // Slack signals failure with `ok: false` on an HTTP 200, so the status code alone
      // is not enough to know the exchange worked.
      if (body['ok'] !== true) {
        return { ok: false, error: `Slack OAuth error: ${str(body['error']) ?? 'unknown'}` };
      }
      const accessToken = str(body['access_token']);
      const team = body['team'] as { id?: unknown } | undefined;
      const teamId = str(team?.id);
      if (!accessToken || !teamId) return { ok: false, error: 'no access_token or team id' };
      return {
        ok: true,
        data: {
          type: 'slack-oauth',
          accessToken,
          refreshToken: str(body['refresh_token']),
          teamId,
          scope: str(body['scope']) ?? '',
        },
      };
    },
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopeSeparator: ' ',
    defaultScopes: GITHUB_CONNECT_SCOPES,
    preferredGrant: 'device',
    parseToken: (body) => {
      const accessToken = str(body['access_token']);
      if (!accessToken) {
        return { ok: false, error: `GitHub OAuth error: ${str(body['error']) ?? 'no access_token'}` };
      }
      // `expires_in`/`refresh_token` appear only when the app opted into expiring
      // tokens. Their absence is the normal case and must stay undefined, not "".
      const expiresIn = num(body['expires_in']);
      return {
        ok: true,
        data: {
          type: 'github-oauth',
          accessToken,
          refreshToken: str(body['refresh_token']),
          expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
          scope: str(body['scope']) ?? '',
        },
      };
    },
  },
};

/** The scope string to send this provider, honouring an operator's override. */
export function scopeStringFor(provider: OAuthProvider, configured?: string[]): string {
  const strategy = OAUTH_STRATEGIES[provider];
  const scopes = configured?.length ? configured : strategy.defaultScopes;
  return scopes.join(strategy.scopeSeparator);
}

/**
 * Which grant to actually use, as a pure function of what's configured.
 *
 * The redirect grant needs **both** a client id and a resolvable client secret — the
 * vault throws before it will even build an authorization URL without one, and it needs a
 * callback the provider can reach. So: an operator who configured a full redirect app
 * gets the redirect flow (fewer clicks, no code typing); everyone else gets the provider's
 * preferred grant, which for GitHub is the secretless device flow. Providers with no
 * device grant fall back to `redirect` and fail loudly on the missing secret, exactly as
 * they do today.
 */
export function resolveGrant(
  provider: OAuthProvider,
  cfg: { clientId?: string; hasSecret: boolean } | undefined,
): OAuthGrant {
  if (cfg?.clientId && cfg.hasSecret) return 'redirect';
  return OAUTH_STRATEGIES[provider].preferredGrant;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
