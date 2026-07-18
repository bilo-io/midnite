import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/** DI token for a Google JWKS key resolver override (tests inject a local set). */
export const GOOGLE_JWKS_RESOLVER = Symbol('GOOGLE_JWKS_RESOLVER');
import {
  type LoginProvider,
  LOGIN_PROVIDERS,
  type AuthResponse,
  type MidniteConfig,
  type SsoProviderConfig,
  SsoRedirectPathSchema,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { CryptoService } from '../crypto/crypto.service';
import { TeamsService } from '../teams/teams.service';
import { UsersService, type SsoProfile } from '../users/users.service';
import { JwtService } from './jwt.service';
import { SsoStateRepository } from './sso-state.repository';

/** How long a `start` nonce / a callback exchange code stays valid. */
const STATE_TTL_MS = 10 * 60 * 1000;

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

/** The provider is not configured (no config block, or its client secret env is unset). */
export class SsoNotConfiguredError extends Error {
  constructor(provider: LoginProvider) {
    super(`SSO provider "${provider}" is not configured`);
    this.name = 'SsoNotConfiguredError';
  }
}

/** The encrypted state failed to decrypt/parse, its nonce was replayed/expired, or it was tampered. */
export class SsoStateInvalidError extends Error {
  constructor() {
    super('invalid, expired, or replayed SSO state');
    this.name = 'SsoStateInvalidError';
  }
}

/** The provider rejected the exchange, or we could not resolve a usable identity/email. */
export class SsoProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SsoProviderError';
  }
}

/** Opaque, GCM-encrypted CSRF state embedded in the authorize URL. */
interface SsoStatePayload {
  provider: LoginProvider;
  nonce: string;
  redirect?: string;
  exp: number;
}

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  // Lazily-built remote JWKS for Google id_token verification (cached across calls).
  private googleJwks?: JWTVerifyGetKey;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    private readonly stateRepo: SsoStateRepository,
    private readonly users: UsersService,
    private readonly jwtSvc: JwtService,
    private readonly teams: TeamsService,
    // Google id_token key source. Unset in production ⇒ the real remote JWKS is
    // built lazily; tests inject a local JWKS so verification is deterministic + offline.
    @Optional() @Inject(GOOGLE_JWKS_RESOLVER) private readonly googleJwksOverride?: JWTVerifyGetKey,
  ) {}

  /** The Google JWKS key resolver — an injected override, else the memoized remote set. */
  private googleKeyResolver(): JWTVerifyGetKey {
    if (this.googleJwksOverride) return this.googleJwksOverride;
    this.googleJwks ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
    return this.googleJwks;
  }

  /** Providers with a config block whose client secret env var is actually set. */
  enabledProviders(): LoginProvider[] {
    return LOGIN_PROVIDERS.filter((p) => this.resolveClient(p) !== null);
  }

  /**
   * Build the provider authorization URL for `GET /start`. Writes a single-use
   * nonce row (TTL) and embeds an encrypted state carrying it + the resume path.
   * `callbackBaseUrl` is the gateway origin the provider will redirect back to.
   */
  buildAuthorizationUrl(provider: LoginProvider, redirect: string | undefined, callbackBaseUrl: string): string {
    const client = this.requireClient(provider);
    const now = Date.now();
    // Opportunistically bound the table — no scheduler needed for a low-volume store.
    this.stateRepo.pruneExpired(now);
    const nonce = randomUUID();
    this.stateRepo.insert({
      id: nonce,
      kind: 'nonce',
      provider,
      redirect: redirect ?? null,
      userId: null,
      expiresAt: now + STATE_TTL_MS,
      createdAt: new Date(now).toISOString(),
    });
    const state = this.crypto.encrypt(
      JSON.stringify({ provider, nonce, redirect, exp: now + STATE_TTL_MS } satisfies SsoStatePayload),
    );
    const callbackUri = this.callbackUri(provider, callbackBaseUrl);

    if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: client.clientId,
        redirect_uri: callbackUri,
        response_type: 'code',
        scope: client.scopes.join(' ') || 'openid email profile',
        access_type: 'offline',
        state,
      });
      return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }
    // github
    const params = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: callbackUri,
      scope: client.scopes.join(' ') || 'read:user user:email',
      state,
    });
    return `${GITHUB_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Validate the callback, resolve the provider identity, find-or-create the user,
   * and mint a single-use exchange `code` bound to that user. Returns the code plus
   * the (re-validated) resume path; the caller 302s the browser to the web app with
   * the code (Decision §3 — never tokens in the URL).
   */
  async handleCallback(
    provider: LoginProvider,
    code: string,
    stateParam: string,
    callbackBaseUrl: string,
  ): Promise<{ exchangeCode: string; redirect: string }> {
    const payload = this.decryptState(stateParam);
    if (!payload || payload.provider !== provider || payload.exp < Date.now()) {
      throw new SsoStateInvalidError();
    }
    // Single-use: the nonce row must still exist (not replayed) and be unexpired.
    const nonceRow = this.stateRepo.take(payload.nonce, 'nonce');
    if (!nonceRow || nonceRow.expiresAt < Date.now()) throw new SsoStateInvalidError();

    const profile =
      provider === 'google'
        ? await this.resolveGoogle(code, callbackBaseUrl)
        : await this.resolveGithub(code, callbackBaseUrl);

    // Signup policy mirrors POST /auth/register, which is currently open (no server
    // gate); Theme E may add a flag over this same call. Existing users always sign in.
    const user = await this.users.findOrCreateFromSso(profile, { signupOpen: true });

    const exchangeCode = randomUUID();
    const now = Date.now();
    this.stateRepo.insert({
      id: exchangeCode,
      kind: 'code',
      provider,
      redirect: null,
      userId: user.id,
      expiresAt: now + STATE_TTL_MS,
      createdAt: new Date(now).toISOString(),
    });

    const redirect = this.safeRedirect(payload.redirect);
    return { exchangeCode, redirect };
  }

  /**
   * Consume a one-time exchange code and issue fresh JWTs for its user — the same
   * `AuthResponse` `POST /auth/login` returns. Tokens are minted here, never
   * persisted in the state table.
   */
  exchangeCode(code: string): AuthResponse {
    const row = this.stateRepo.take(code, 'code');
    if (!row || row.expiresAt < Date.now() || !row.userId) throw new SsoStateInvalidError();
    const user = this.users.getUser(row.userId);
    const teamId = this.teams.listTeamsForUser(user.id)[0]?.id ?? null;
    const accessToken = this.jwtSvc.issueAccessToken(user.id, user.email, teamId);
    const refreshToken = this.jwtSvc.issueRefreshToken(user.id);
    return { accessToken, refreshToken, user: { ...user, identities: this.users.listIdentities(user.id) } };
  }

  // ── provider identity resolution ──────────────────────────────────────────

  private async resolveGoogle(code: string, callbackBaseUrl: string): Promise<SsoProfile> {
    const client = this.requireClient('google');
    const resp = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        code,
        client_id: client.clientId,
        client_secret: client.clientSecret,
        redirect_uri: this.callbackUri('google', callbackBaseUrl),
        grant_type: 'authorization_code',
      }),
    });
    if (!resp.ok) throw new SsoProviderError('Google token exchange failed');
    const tokens = (await resp.json()) as { id_token?: string };
    if (!tokens.id_token) throw new SsoProviderError('Google response had no id_token');

    // Verify signature (Google JWKS) + audience + issuer offline, then trust claims.
    let claims: {
      sub?: unknown;
      email?: unknown;
      email_verified?: unknown;
      name?: unknown;
      picture?: unknown;
    };
    try {
      const verified = await jwtVerify(tokens.id_token, this.googleKeyResolver(), {
        issuer: GOOGLE_ISSUERS,
        audience: client.clientId,
      });
      claims = verified.payload;
    } catch (err) {
      throw new SsoProviderError('Google id_token verification failed', { cause: err });
    }
    if (typeof claims.sub !== 'string' || typeof claims.email !== 'string') {
      throw new SsoProviderError('Google id_token missing sub/email');
    }
    return {
      provider: 'google',
      providerUserId: claims.sub,
      email: claims.email,
      emailVerified: claims.email_verified === true,
      name: typeof claims.name === 'string' ? claims.name : undefined,
      avatarUrl: typeof claims.picture === 'string' ? claims.picture : undefined,
    };
  }

  private async resolveGithub(code: string, callbackBaseUrl: string): Promise<SsoProfile> {
    const client = this.requireClient('github');
    const tokenResp = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        code,
        client_id: client.clientId,
        client_secret: client.clientSecret,
        redirect_uri: this.callbackUri('github', callbackBaseUrl),
      }),
    });
    if (!tokenResp.ok) throw new SsoProviderError('GitHub token exchange failed');
    const token = (await tokenResp.json()) as { access_token?: string; error?: string };
    if (!token.access_token) throw new SsoProviderError(`GitHub token exchange error: ${token.error ?? 'unknown'}`);

    const authHeaders = {
      authorization: `Bearer ${token.access_token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'midnite',
    };
    const [userResp, emailsResp] = await Promise.all([
      fetch(GITHUB_USER_URL, { headers: authHeaders }),
      fetch(GITHUB_EMAILS_URL, { headers: authHeaders }),
    ]);
    if (!userResp.ok) throw new SsoProviderError('GitHub /user request failed');
    const ghUser = (await userResp.json()) as {
      id?: number;
      login?: string;
      name?: string | null;
      avatar_url?: string | null;
    };
    if (typeof ghUser.id !== 'number') throw new SsoProviderError('GitHub /user missing id');

    // Primary + verified email only (Decision §1 safety) → auto-linkable.
    let email: string | undefined;
    let emailVerified = false;
    if (emailsResp.ok) {
      const emails = (await emailsResp.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primaryVerified = emails.find((e) => e.primary && e.verified);
      if (primaryVerified) {
        email = primaryVerified.email;
        emailVerified = true;
      } else {
        email = emails.find((e) => e.primary)?.email ?? emails[0]?.email;
      }
    }
    if (!email) throw new SsoProviderError('GitHub account has no accessible email');

    return {
      provider: 'github',
      providerUserId: String(ghUser.id),
      email,
      emailVerified,
      name: ghUser.name ?? ghUser.login ?? undefined,
      avatarUrl: typeof ghUser.avatar_url === 'string' ? ghUser.avatar_url : undefined,
    };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  /**
   * The gateway callback URL the provider redirects back to. Config-pinned
   * `redirectUri` (Decision §7 — the exact URL the app registration expects) wins;
   * otherwise derive `${requestOrigin}/auth/sso/:provider/callback`.
   */
  private callbackUri(provider: LoginProvider, callbackBaseUrl: string): string {
    const pinned = this.config.gateway.auth.sso?.[provider]?.redirectUri;
    if (pinned) return pinned;
    return `${callbackBaseUrl.replace(/\/+$/, '')}/auth/sso/${provider}/callback`;
  }

  private requireClient(provider: LoginProvider): SsoProviderConfig & { clientSecret: string } {
    const client = this.resolveClient(provider);
    if (!client) throw new SsoNotConfiguredError(provider);
    return client;
  }

  /** Resolve a provider's config + client secret from env, or null if not fully configured. */
  private resolveClient(provider: LoginProvider): (SsoProviderConfig & { clientSecret: string }) | null {
    const cfg = this.config.gateway.auth.sso?.[provider];
    if (!cfg) return null;
    const clientSecret = process.env[cfg.clientSecretEnv];
    if (!clientSecret) return null;
    return { ...cfg, clientSecret };
  }

  private decryptState(state: string): SsoStatePayload | null {
    const plain = this.crypto.decrypt(state);
    if (!plain) return null;
    try {
      return JSON.parse(plain) as SsoStatePayload;
    } catch {
      return null;
    }
  }

  /** Re-validate the resume path at callback time (defense in depth); default "/". */
  private safeRedirect(redirect: string | undefined): string {
    if (!redirect) return '/';
    return SsoRedirectPathSchema.safeParse(redirect).success ? redirect : '/';
  }
}
