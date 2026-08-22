import { randomUUID } from 'node:crypto';

// GitHub's OAuth **device grant** — the one authorization flow that needs no client
// secret and no reachable callback URL, which is why it's the zero-config path for a
// downloaded app running its own local gateway (Phase 84 Decision §11).
//
// This is the single implementation of the flow's fiddly parts, shared by the two
// callers that need it:
//
//   - **login** (`auth/sso.service.ts`) — grants a token, resolves a profile, provisions
//     a user. Scopes: `read:user user:email`.
//   - **connect** (`workflows/credentials/oauth.service.ts`, Phase 84 Theme A) — grants a
//     token and stores it as a per-user `github-oauth` credential. Scopes: `repo project
//     read:org`.
//
// Deliberately a **plain class, not a Nest provider**: each caller owns its own instance
// and therefore its own pending-authorization namespace. That is the correct boundary —
// a connect handle must not be pollable through the login endpoint — and it means
// `SsoService`'s constructor and its specs are untouched by the extraction.
//
// What the flow gets right, and what a second hand-rolled copy would get wrong:
//   - the client only ever holds **our opaque id**, never GitHub's `device_code`
//   - polls are forwarded to GitHub **at most once per provider interval**, so an eager
//     client can't trip a rate limit, and `slow_down` bumps that interval
//   - `expired_token` / `access_denied` are **terminal states**, not exceptions
//   - a grant is **one-shot**: the entry is dropped before the caller acts on the token,
//     so a failed follow-up (an allowlist rejection, say) can't be re-polled into a
//     different outcome

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

/** How long a pending authorization is kept when GitHub reports no `expires_in`. */
const FALLBACK_TTL_MS = 15 * 60 * 1000;
/** Provider poll interval assumed when GitHub reports none (its documented default). */
const DEFAULT_INTERVAL_SECONDS = 5;
/** Extra back-off applied on `slow_down` when GitHub sends no replacement interval. */
const SLOW_DOWN_BUMP_MS = 5_000;

/** A pending device authorization, kept server-side and keyed by the opaque poll id. */
interface PendingDeviceAuth {
  deviceCode: string;
  clientId: string;
  /** Minimum ms between forwarded polls (bumped on `slow_down`). */
  intervalMs: number;
  expiresAt: number;
  /** Last time a poll was actually forwarded to GitHub (0 = never). */
  lastForwardAt: number;
}

export type DeviceGrantStart = {
  /** Opaque handle the client polls with — never GitHub's `device_code`. */
  deviceAuthId: string;
  userCode: string;
  verificationUri: string;
  expiresInSeconds: number;
  intervalSeconds: number;
};

/**
 * A poll's outcome. `granted` hands the raw token back to the caller rather than acting
 * on it, which is what lets login provision a user and connect store a credential from
 * the same flow.
 */
export type DeviceGrantPoll =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'denied' }
  | { status: 'granted'; accessToken: string; scope: string };

/** GitHub rejected the device request, or sent something unusable. */
export class DeviceGrantError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DeviceGrantError';
  }
}

/** Injectable `fetch`, so both callers' specs can stub the provider. */
export type FetchLike = typeof fetch;

export class DeviceGrantFlow {
  private readonly pending = new Map<string, PendingDeviceAuth>();

  /**
   * `fetchImpl` is read through a getter rather than captured, so a caller whose spec
   * stubs the **global** `fetch` after construction still sees the stub — which is how
   * `sso.service.test.ts` has always worked, and why that spec needs no edit.
   */
  constructor(private readonly fetchImpl?: FetchLike) {}

  private get doFetch(): FetchLike {
    return this.fetchImpl ?? fetch;
  }

  /**
   * Ask GitHub for a user code and stash the `device_code` server-side.
   *
   * GitHub reports "device flow not enabled on this OAuth app" as an `error` field on a
   * 200, not as a failure status — forgetting to tick **Enable Device Flow** at app
   * registration is the classic setup mistake, so it surfaces as an error rather than a
   * flow that silently never completes.
   */
  async start(opts: { clientId: string; scope: string }): Promise<DeviceGrantStart> {
    const resp = await this.doFetch(DEVICE_CODE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({ client_id: opts.clientId, scope: opts.scope }),
    });
    if (!resp.ok) throw new DeviceGrantError('GitHub device code request failed');
    const body = (await resp.json()) as {
      device_code?: string;
      user_code?: string;
      verification_uri?: string;
      expires_in?: number;
      interval?: number;
      error?: string;
    };
    if (body.error || !body.device_code || !body.user_code || !body.verification_uri) {
      throw new DeviceGrantError(`GitHub device code error: ${body.error ?? 'malformed response'}`);
    }

    const now = Date.now();
    // Opportunistically drop expired entries — no scheduler needed for a tiny map.
    for (const [id, auth] of this.pending) {
      if (auth.expiresAt < now) this.pending.delete(id);
    }

    const deviceAuthId = randomUUID();
    const expiresInSeconds = body.expires_in ?? Math.floor(FALLBACK_TTL_MS / 1000);
    // `??` not `||`: an interval of 0 is a legitimate "don't throttle" and must survive.
    const intervalSeconds = body.interval ?? DEFAULT_INTERVAL_SECONDS;
    this.pending.set(deviceAuthId, {
      deviceCode: body.device_code,
      clientId: opts.clientId,
      intervalMs: intervalSeconds * 1000,
      expiresAt: now + expiresInSeconds * 1000,
      lastForwardAt: 0,
    });
    return { deviceAuthId, userCode: body.user_code, verificationUri: body.verification_uri, expiresInSeconds, intervalSeconds };
  }

  /**
   * Poll a pending authorization. An unknown or lapsed handle reads as `expired`, which
   * is the honest answer to "can I still complete this?" and keeps the caller from
   * having to distinguish never-existed from timed-out.
   */
  async poll(deviceAuthId: string): Promise<DeviceGrantPoll> {
    const auth = this.pending.get(deviceAuthId);
    if (!auth) return { status: 'expired' };
    const now = Date.now();
    if (auth.expiresAt < now) {
      this.pending.delete(deviceAuthId);
      return { status: 'expired' };
    }
    // Throttle: forward only once the provider's interval has elapsed.
    if (now - auth.lastForwardAt < auth.intervalMs) return { status: 'pending' };
    auth.lastForwardAt = now;

    const resp = await this.doFetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        client_id: auth.clientId,
        device_code: auth.deviceCode,
        grant_type: DEVICE_GRANT_TYPE,
      }),
    });
    if (!resp.ok) throw new DeviceGrantError('GitHub device token request failed');
    const body = (await resp.json()) as {
      access_token?: string;
      scope?: string;
      error?: string;
      interval?: number;
    };

    if (body.error === 'authorization_pending') return { status: 'pending' };
    if (body.error === 'slow_down') {
      auth.intervalMs =
        typeof body.interval === 'number' ? body.interval * 1000 : auth.intervalMs + SLOW_DOWN_BUMP_MS;
      return { status: 'pending' };
    }
    if (body.error === 'expired_token') {
      this.pending.delete(deviceAuthId);
      return { status: 'expired' };
    }
    if (body.error === 'access_denied') {
      this.pending.delete(deviceAuthId);
      return { status: 'denied' };
    }
    if (body.error || !body.access_token) {
      this.pending.delete(deviceAuthId);
      throw new DeviceGrantError(`GitHub device grant error: ${body.error ?? 'no access_token'}`);
    }

    // One-shot: drop the entry *before* the caller acts on the token, so a failure in
    // whatever it does next can't be re-polled into a different outcome.
    this.pending.delete(deviceAuthId);
    return { status: 'granted', accessToken: body.access_token, scope: body.scope ?? '' };
  }
}
