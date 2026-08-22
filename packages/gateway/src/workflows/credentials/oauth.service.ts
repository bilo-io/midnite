import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type {
  MidniteConfig,
  OAuthGrant,
  OAuthProvider,
  WorkflowCredential,
  WorkflowCredentialData,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../../config.token';
import { CryptoService } from '../../crypto/crypto.service';
import { DeviceGrantError, DeviceGrantFlow, type DeviceGrantStart } from '../../lib/device-grant';
import { OAUTH_STRATEGIES, resolveGrant, scopeStringFor } from './oauth-strategies';
import { type CredentialOwner, WorkflowCredentialsService } from './workflow-credentials.service';

// Opaque CSRF state blob encrypted with CryptoService. Validated on callback.
interface OAuthStatePayload {
  provider: OAuthProvider;
  credentialName: string;
  redirectUri: string;
  nonce: string;
}

/**
 * The midnite GitHub **connect** app's client ID — the built-in fallback for the device
 * grant, resolved exactly like the login one so an operator can substitute their own app
 * without touching code.
 *
 * Deliberately distinct from `DEFAULT_GITHUB_DEVICE_CLIENT_ID` in `auth/sso.service.ts`:
 * GitHub OAuth Apps grant scopes **app-wide at first authorization**, so pointing connect
 * at the login app would either force every existing user to re-consent at sign-in or
 * leave connect without the `repo project` scopes it needs (Decision §1/§4). Client IDs
 * are public identifiers by design — they ride in every authorize URL.
 */
export const DEFAULT_GITHUB_CONNECT_CLIENT_ID = 'Ov23liQ8mTvKcXwPzR4d';

/** Where a user manages (and can revoke) an OAuth app's access to their account. */
const GITHUB_APP_AUTHORIZATIONS_URL = 'https://github.com/settings/applications';

/** A pending device connect, so the poll can finish what `start` began. */
interface PendingConnect {
  provider: OAuthProvider;
  credentialName: string;
  owner: CredentialOwner;
}

/** Outcome of polling a device connect. `complete` carries the stored credential. */
export type DeviceConnectPoll =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'denied' }
  | { status: 'complete'; credential: WorkflowCredential };

/** What a disconnect actually achieved — see {@link OAuthService.disconnect}. */
export type DisconnectResult = {
  disconnected: boolean;
  revokedAtProvider: boolean;
  manageUrl?: string;
};

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  // Connect's own device-grant namespace. A *login* handle must not be pollable here,
  // and vice versa — see the note in `lib/device-grant.ts`.
  private readonly deviceFlow = new DeviceGrantFlow();
  private readonly pendingConnects = new Map<string, PendingConnect>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(WorkflowCredentialsService) private readonly credService: WorkflowCredentialsService,
  ) {}

  /**
   * Which grant this install will use for `provider`, as data rather than a branch in
   * the controller. GitHub with no operator config ⇒ `device` (the zero-config path);
   * a configured client id **and** a resolvable secret ⇒ `redirect`.
   */
  grantFor(provider: OAuthProvider): OAuthGrant {
    const cfg = this.config.workflows.oauth[provider];
    return resolveGrant(provider, cfg ? { clientId: cfg.clientId, hasSecret: this.hasSecret(provider) } : undefined);
  }

  // --- Device grant (the secretless path — Phase 84 Theme A, Decision §11) ---

  /**
   * Begin a device connect. Returns the user code + verification URI to show, plus an
   * opaque poll handle; GitHub's own `device_code` never leaves the gateway.
   *
   * `owner` is the acting user, so the credential this lands is **theirs** rather than
   * install-wide.
   */
  async startDeviceConnect(
    provider: OAuthProvider,
    credentialName: string,
    owner: CredentialOwner,
  ): Promise<DeviceGrantStart> {
    if (this.grantFor(provider) !== 'device') {
      throw new BadRequestException(
        `OAuth provider "${provider}" uses the redirect flow on this install — start it at /oauth/${provider}/start.`,
      );
    }
    const cfg = this.config.workflows.oauth[provider];
    const scope = scopeStringFor(provider, cfg?.scopes);
    let started: DeviceGrantStart;
    try {
      started = await this.deviceFlow.start({ clientId: this.deviceClientId(provider), scope });
    } catch (err) {
      throw asBadRequest(err);
    }
    this.pendingConnects.set(started.deviceAuthId, { provider, credentialName, owner });
    return started;
  }

  /**
   * Poll a pending device connect. On grant, store the token as a `github-oauth`
   * credential owned by the user who started the flow and return the secret-free view.
   *
   * `expired`/`denied` are outcomes, not errors: the UI offers a retry for each, and a
   * user declining consent is not a fault.
   */
  async pollDeviceConnect(deviceAuthId: string): Promise<DeviceConnectPoll> {
    const pending = this.pendingConnects.get(deviceAuthId);
    if (!pending) return { status: 'expired' };
    let outcome;
    try {
      outcome = await this.deviceFlow.poll(deviceAuthId);
    } catch (err) {
      this.pendingConnects.delete(deviceAuthId);
      throw asBadRequest(err);
    }
    if (outcome.status === 'pending') return { status: 'pending' };
    // Terminal either way from here — drop the entry before doing anything else so a
    // failure below can't be re-polled into a different result.
    this.pendingConnects.delete(deviceAuthId);
    if (outcome.status !== 'granted') return { status: outcome.status };

    const parsed = OAUTH_STRATEGIES[pending.provider].parseToken({
      access_token: outcome.accessToken,
      scope: outcome.scope,
    });
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    // The granted scope is what GitHub actually gave us, not what we asked for — so the
    // UI can tell the user a re-consent is needed rather than guessing.
    const credential = this.credService.create(
      { name: pending.credentialName, data: parsed.data },
      pending.owner,
    );
    this.logger.log(`${pending.provider} connected for user ${pending.owner.userId ?? 'install'}`);
    return { status: 'complete', credential };
  }

  // --- Redirect grant (the hosted-operator opt-in) ---

  /**
   * Build the provider authorization URL. The caller redirects the browser here.
   * Embeds an encrypted CSRF state blob so the callback can validate + recover context.
   */
  buildAuthorizationUrl(
    provider: OAuthProvider,
    credentialName: string,
    redirectUri: string,
    callbackBaseUrl: string,
  ): string {
    const { cfg } = this.requireRedirectConfig(provider);
    const strategy = OAUTH_STRATEGIES[provider];
    const state = this.encryptState({ provider, credentialName, redirectUri, nonce: randomUUID() });
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: this.callbackUri(provider, callbackBaseUrl),
      scope: scopeStringFor(provider, cfg.scopes),
      state,
      ...(strategy.extraAuthParams ?? {}),
    });
    return `${strategy.authUrl}?${params.toString()}`;
  }

  /**
   * Handle the OAuth callback: validate state, exchange code for tokens,
   * create a workflow_credentials row, and return the new credential + redirect URI.
   */
  async handleCallback(
    provider: OAuthProvider,
    code: string,
    stateParam: string,
    callbackBaseUrl: string,
    owner?: CredentialOwner,
  ): Promise<{ credential: WorkflowCredential; redirectUri: string }> {
    const statePayload = this.decryptState(stateParam);
    if (!statePayload || statePayload.provider !== provider) {
      throw new BadRequestException('Invalid or expired OAuth state parameter.');
    }
    const { cfg, clientSecret } = this.requireRedirectConfig(provider);
    const strategy = OAUTH_STRATEGIES[provider];

    const resp = await fetch(strategy.tokenUrl, {
      method: 'POST',
      // `accept: application/json` matters for GitHub, which otherwise answers
      // form-encoded; the other providers already send JSON and ignore it.
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: clientSecret,
        redirect_uri: this.callbackUri(provider, callbackBaseUrl),
        grant_type: 'authorization_code',
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      this.logger.error({ provider, status: resp.status, body }, `${provider} token exchange failed`);
      throw new BadRequestException(`${titleCase(provider)} token exchange failed.`);
    }
    const parsed = strategy.parseToken((await resp.json()) as Record<string, unknown>);
    if (!parsed.ok) {
      this.logger.error({ provider, error: parsed.error }, `${provider} token exchange error`);
      throw new BadRequestException(parsed.error);
    }
    const credential = this.credService.create(
      { name: statePayload.credentialName, data: parsed.data },
      owner,
    );
    return { credential, redirectUri: statePayload.redirectUri };
  }

  // --- Refresh ---

  /**
   * Refresh a Google OAuth access token. Returns the new access token + expiry, or null
   * on failure (fail-closed). Slack tokens don't use standard OAuth refresh; new tokens
   * require re-auth.
   */
  async refreshGoogleToken(
    credentialId: string,
    refreshToken: string,
    credentialName: string,
    scope: string,
  ): Promise<{ accessToken: string; expiresAt: string } | null> {
    const refreshed = await this.refreshWithGrant('google', credentialId, refreshToken, credentialName, (body) => {
      const parsed = OAUTH_STRATEGIES['google'].parseToken(body);
      if (!parsed.ok || parsed.data.type !== 'google-oauth') return null;
      // Google omits `refresh_token` on a refresh response — carry the existing one
      // forward, or the credential becomes un-refreshable after its first renewal.
      return { ...parsed.data, refreshToken, scope };
    });
    if (!refreshed || refreshed.type !== 'google-oauth') return null;
    return { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt };
  }

  /**
   * Refresh a GitHub connection, for the rare app that opted into expiring tokens. Only
   * reached when the credential actually carries a `refreshToken` **and** an `expiresAt`
   * — a non-expiring token has nothing to refresh and never gets here.
   */
  async refreshGithubToken(
    credentialId: string,
    current: Extract<WorkflowCredentialData, { type: 'github-oauth' }>,
    credentialName: string,
  ): Promise<WorkflowCredentialData | null> {
    if (!current.refreshToken) return null;
    return this.refreshWithGrant('github', credentialId, current.refreshToken, credentialName, (body) => {
      const parsed = OAUTH_STRATEGIES['github'].parseToken(body);
      if (!parsed.ok || parsed.data.type !== 'github-oauth') return null;
      return { ...parsed.data, refreshToken: parsed.data.refreshToken ?? current.refreshToken };
    });
  }

  /**
   * The shared refresh-and-rewrite path. Credential blobs are immutable once written, so
   * a refresh is delete-and-recreate **with the same id** — and now also with the same
   * owner, or a refreshed personal connection would silently become install-wide.
   */
  private async refreshWithGrant(
    provider: OAuthProvider,
    credentialId: string,
    refreshToken: string,
    credentialName: string,
    build: (body: Record<string, unknown>) => WorkflowCredentialData | null,
  ): Promise<WorkflowCredentialData | null> {
    const cfg = this.config.workflows.oauth[provider];
    if (!cfg) return null;
    const clientSecret = process.env[cfg.clientSecretEnv];
    if (!clientSecret) return null;

    try {
      const resp = await fetch(OAUTH_STRATEGIES[provider].tokenUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
          client_id: cfg.clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      if (!resp.ok) return null;
      const next = build((await resp.json()) as Record<string, unknown>);
      if (!next) return null;

      const owner = this.credService.ownerOf(credentialId);
      this.credService.remove(credentialId);
      this.credService.createWithId(credentialId, credentialName, next, owner);
      return next;
    } catch (err) {
      this.logger.warn({ err, provider }, 'OAuth token refresh failed');
      return null;
    }
  }

  // --- Disconnect ---

  /**
   * Disconnect `userId`'s connection to `provider`.
   *
   * The local credential is **always** deleted. Revoking at GitHub is attempted only when
   * the operator configured a client secret, because GitHub's revocation endpoints
   * (`DELETE /applications/{client_id}/grant`) require Basic auth with it — which the
   * secretless device-flow install, by design, does not have. Rather than pretend, the
   * result says what actually happened and hands back the URL where the user can finish
   * the job themselves; the UI shows that instead of claiming a revoke that never ran.
   */
  async disconnect(provider: OAuthProvider, userId: string): Promise<DisconnectResult> {
    const row = await this.credService.resolveOwnedByType(userId, providerCredentialType(provider));
    if (!row) return { disconnected: false, revokedAtProvider: false };

    const token = 'accessToken' in row.data ? row.data.accessToken : undefined;
    this.credService.remove(row.id);

    const revokedAtProvider = token ? await this.revokeAtProvider(provider, token) : false;
    return {
      disconnected: true,
      revokedAtProvider,
      manageUrl: revokedAtProvider ? undefined : GITHUB_APP_AUTHORIZATIONS_URL,
    };
  }

  /** Best-effort revoke. `false` covers "no secret to authenticate with" and a failed call alike. */
  private async revokeAtProvider(provider: OAuthProvider, token: string): Promise<boolean> {
    if (provider !== 'github') return false;
    const cfg = this.config.workflows.oauth['github'];
    const clientSecret = cfg ? process.env[cfg.clientSecretEnv] : undefined;
    if (!cfg?.clientId || !clientSecret) {
      this.logger.log(
        'GitHub connection deleted locally; no client secret configured, so it stays authorised at GitHub until the user revokes it there',
      );
      return false;
    }
    try {
      const basic = Buffer.from(`${cfg.clientId}:${clientSecret}`).toString('base64');
      const resp = await fetch(`https://api.github.com/applications/${cfg.clientId}/grant`, {
        method: 'DELETE',
        headers: {
          authorization: `Basic ${basic}`,
          accept: 'application/vnd.github+json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ access_token: token }),
      });
      // 204 on success; 404 means the grant was already gone, which is the same outcome.
      if (resp.status === 204 || resp.status === 404) return true;
      this.logger.warn(`GitHub token revocation returned ${resp.status}`);
      return false;
    } catch (err) {
      this.logger.warn({ err }, 'GitHub token revocation failed');
      return false;
    }
  }

  // --- helpers ---

  /** The client id the device grant authenticates as (operator override or built-in). */
  private deviceClientId(provider: OAuthProvider): string {
    if (provider !== 'github') {
      const cfg = this.config.workflows.oauth[provider];
      if (!cfg?.clientId) throw new BadRequestException(`OAuth provider "${provider}" is not configured.`);
      return cfg.clientId;
    }
    return this.config.workflows.oauth['github']?.clientId ?? DEFAULT_GITHUB_CONNECT_CLIENT_ID;
  }

  private hasSecret(provider: OAuthProvider): boolean {
    const cfg = this.config.workflows.oauth[provider];
    return !!cfg && !!process.env[cfg.clientSecretEnv];
  }

  /**
   * Config + secret for the redirect grant, or a 400 naming what's missing. A
   * half-configured app (client id set, secret env unset) must fail loudly rather than
   * silently falling back to the device flow with the wrong scopes.
   */
  private requireRedirectConfig(provider: OAuthProvider): {
    cfg: { clientId: string; clientSecretEnv: string; scopes?: string[] };
    clientSecret: string;
  } {
    const cfg = this.config.workflows.oauth[provider];
    if (!cfg) {
      throw new BadRequestException(
        `OAuth provider "${provider}" is not configured. ` +
          `Add a workflows.oauth.${provider} block to midnite.json.`,
      );
    }
    const clientSecret = process.env[cfg.clientSecretEnv];
    if (!clientSecret) {
      throw new BadRequestException(`OAuth client secret env var "${cfg.clientSecretEnv}" is not set.`);
    }
    return { cfg, clientSecret };
  }

  private callbackUri(provider: OAuthProvider, callbackBaseUrl: string): string {
    return `${callbackBaseUrl}/oauth/${provider}/callback`;
  }

  private encryptState(payload: OAuthStatePayload): string {
    // The v1: prefix + base64 is URL-safe after encodeURIComponent (done by URLSearchParams).
    return this.crypto.encrypt(JSON.stringify(payload));
  }

  private decryptState(state: string): OAuthStatePayload | null {
    const plain = this.crypto.decrypt(state);
    if (!plain) return null;
    try {
      return JSON.parse(plain) as OAuthStatePayload;
    } catch {
      return null;
    }
  }
}

/** The credential type a provider's connect flow stores. */
function providerCredentialType(provider: OAuthProvider): WorkflowCredentialData['type'] {
  return provider === 'github' ? 'github-oauth' : provider === 'google' ? 'google-oauth' : 'slack-oauth';
}

function asBadRequest(err: unknown): Error {
  if (err instanceof DeviceGrantError) return new BadRequestException(err.message);
  return err instanceof Error ? err : new Error(String(err));
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
