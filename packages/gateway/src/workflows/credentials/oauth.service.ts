import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { MidniteConfig, OAuthProvider } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../../config.token';
import { CryptoService } from '../../crypto/crypto.service';
import { WorkflowCredentialsService } from './workflow-credentials.service';
import type { WorkflowCredential } from '@midnite/shared';

// Opaque CSRF state blob encrypted with CryptoService. Validated on callback.
interface OAuthStatePayload {
  provider: OAuthProvider;
  credentialName: string;
  redirectUri: string;
  nonce: string;
}

// Token exchange response shapes (subset of what the providers return).
interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface SlackTokenResponse {
  ok: boolean;
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope: string;
  team: { id: string; name: string };
  error?: string;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(CryptoService) private readonly crypto: CryptoService,
    @Inject(WorkflowCredentialsService) private readonly credService: WorkflowCredentialsService,
  ) {}

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
    const oauthCfg = this.config.workflows.oauth[provider];
    if (!oauthCfg) {
      throw new BadRequestException(
        `OAuth provider "${provider}" is not configured. ` +
          `Add a workflows.oauth.${provider} block to midnite.json.`,
      );
    }
    const clientSecret = process.env[oauthCfg.clientSecretEnv];
    if (!clientSecret) {
      throw new BadRequestException(
        `OAuth client secret env var "${oauthCfg.clientSecretEnv}" is not set.`,
      );
    }

    const state = this.encryptState({ provider, credentialName, redirectUri, nonce: randomUUID() });
    const callbackUri = `${callbackBaseUrl}/oauth/${provider}/callback`;

    if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: oauthCfg.clientId,
        redirect_uri: callbackUri,
        response_type: 'code',
        scope: oauthCfg.scopes.join(' ') || 'https://www.googleapis.com/auth/drive.file',
        access_type: 'offline',
        prompt: 'consent',
        state,
      });
      return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    // slack
    const params = new URLSearchParams({
      client_id: oauthCfg.clientId,
      redirect_uri: callbackUri,
      scope: oauthCfg.scopes.join(',') || 'channels:read,chat:write',
      state,
    });
    return `${SLACK_AUTH_URL}?${params.toString()}`;
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
  ): Promise<{ credential: WorkflowCredential; redirectUri: string }> {
    const statePayload = this.decryptState(stateParam);
    if (!statePayload || statePayload.provider !== provider) {
      throw new BadRequestException('Invalid or expired OAuth state parameter.');
    }

    const oauthCfg = this.config.workflows.oauth[provider];
    if (!oauthCfg) throw new BadRequestException(`OAuth provider "${provider}" is not configured.`);
    const clientSecret = process.env[oauthCfg.clientSecretEnv];
    if (!clientSecret) {
      throw new BadRequestException(
        `OAuth client secret env var "${oauthCfg.clientSecretEnv}" is not set.`,
      );
    }

    const callbackUri = `${callbackBaseUrl}/oauth/${provider}/callback`;

    if (provider === 'google') {
      const resp = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: oauthCfg.clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUri,
          grant_type: 'authorization_code',
        }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        this.logger.error({ provider, status: resp.status, body }, 'Google token exchange failed');
        throw new BadRequestException('Google token exchange failed.');
      }
      const tokens = (await resp.json()) as GoogleTokenResponse;
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      const credential = this.credService.create({
        name: statePayload.credentialName,
        data: {
          type: 'google-oauth',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? '',
          expiresAt,
          scope: tokens.scope,
        },
      });
      return { credential, redirectUri: statePayload.redirectUri };
    }

    // slack
    const resp = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: oauthCfg.clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      this.logger.error({ provider, status: resp.status, body }, 'Slack token exchange failed');
      throw new BadRequestException('Slack token exchange failed.');
    }
    const tokens = (await resp.json()) as SlackTokenResponse;
    if (!tokens.ok) {
      this.logger.error({ provider, error: tokens.error }, 'Slack token exchange error');
      throw new BadRequestException(`Slack OAuth error: ${tokens.error ?? 'unknown'}`);
    }
    const credential = this.credService.create({
      name: statePayload.credentialName,
      data: {
        type: 'slack-oauth',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        teamId: tokens.team.id,
        scope: tokens.scope,
      },
    });
    return { credential, redirectUri: statePayload.redirectUri };
  }

  /**
   * Refresh a Google OAuth access token. Returns a new `WorkflowCredential` row
   * (same id) with updated tokens, or null on failure (fail-closed).
   * Slack tokens don't use standard OAuth refresh; new tokens require re-auth.
   */
  async refreshGoogleToken(
    credentialId: string,
    refreshToken: string,
    credentialName: string,
    scope: string,
  ): Promise<{ accessToken: string; expiresAt: string } | null> {
    const oauthCfg = this.config.workflows.oauth['google'];
    if (!oauthCfg) return null;
    const clientSecret = process.env[oauthCfg.clientSecretEnv];
    if (!clientSecret) return null;

    try {
      const resp = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: oauthCfg.clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      if (!resp.ok) return null;
      const tokens = (await resp.json()) as GoogleTokenResponse;
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Replace the credential row (immutable blobs — delete + recreate with same name).
      this.credService.remove(credentialId);
      this.credService.createWithId(credentialId, credentialName, {
        type: 'google-oauth',
        accessToken: tokens.access_token,
        refreshToken,
        expiresAt,
        scope,
      });
      return { accessToken: tokens.access_token, expiresAt };
    } catch (err) {
      this.logger.warn({ err }, 'Google token refresh failed');
      return null;
    }
  }

  // -- helpers --

  private encryptState(payload: OAuthStatePayload): string {
    const json = JSON.stringify(payload);
    const encrypted = this.crypto.encrypt(json);
    // The v1: prefix + base64 is URL-safe after encodeURIComponent (done by URLSearchParams).
    return encrypted;
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
