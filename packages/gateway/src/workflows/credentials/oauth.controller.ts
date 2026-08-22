import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  OAuthProviderSchema,
  OAuthStartParamsSchema,
  type OAuthDevicePollResponse,
  type OAuthDeviceStartResponse,
  type OAuthDisconnectResponse,
  type OAuthProvider,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../../auth/decorators/current-user.decorator';
import { RequiresRole } from '../../auth/decorators/require-role.decorator';
import { OAuthService } from './oauth.service';

// OAuth2 start/callback for workflow credentials. Thin: parse params, delegate to service,
// issue browser redirects. Never returns token material — secrets stay in the credential vault.
@Controller('oauth')
export class OAuthController {
  constructor(@Inject(OAuthService) private readonly service: OAuthService) {}

  /**
   * Redirect the user's browser to the provider's consent screen.
   * Required query params:
   *   credential_name — name to save the resulting credential under
   *   redirect_uri    — where to send the browser after a successful callback
   */
  @Get(':provider/start')
  start(
    @Param('provider') providerRaw: string,
    @Query() query: unknown,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): void {
    const provider = OAuthProviderSchema.safeParse(providerRaw);
    if (!provider.success) {
      throw new BadRequestException(`Unknown OAuth provider: ${providerRaw}`);
    }
    const params = OAuthStartParamsSchema.safeParse(query);
    if (!params.success) {
      throw new BadRequestException(params.error.message);
    }

    void reply.redirect(
      this.service.buildAuthorizationUrl(
        provider.data,
        params.data.credential_name,
        params.data.redirect_uri,
        deriveCallbackBase(reply),
      ),
      302,
    );
  }

  /**
   * Provider redirects here after the user consents. Exchanges the code for tokens,
   * stores them as a workflow credential, and redirects to the client's redirect_uri.
   */
  @Get(':provider/callback')
  async callback(
    @Param('provider') providerRaw: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): Promise<void> {
    if (error) {
      throw new BadRequestException(`OAuth provider returned error: ${error}`);
    }
    if (!code || !state) {
      throw new BadRequestException('Missing code or state parameter in OAuth callback.');
    }
    const provider = OAuthProviderSchema.safeParse(providerRaw);
    if (!provider.success) {
      throw new BadRequestException(`Unknown OAuth provider: ${providerRaw}`);
    }

    // The callback arrives as a top-level browser navigation, so there's no bearer token
    // on it — the credential lands install-wide, exactly as it did before this phase.
    // The device path (below) is authenticated and is what produces a *personal*
    // connection; the redirect grant is the hosted-operator flow.
    const { credential, redirectUri } = await this.service.handleCallback(
      provider.data,
      code,
      state,
      deriveCallbackBase(reply),
    );

    const dest = new URL(redirectUri);
    dest.searchParams.set('credential_id', credential.id);
    void reply.redirect(dest.toString(), 302);
  }

  // --- Device grant (Phase 84 Theme A) — the secretless connect path ---

  /**
   * Start a device authorization. Returns the code to show the user plus an **opaque**
   * poll handle; GitHub's own `device_code` never leaves the gateway.
   *
   * Authenticated, because the credential it lands belongs to the acting user — unlike
   * the redirect callback, which is an unauthenticated browser navigation.
   */
  @Post(':provider/device')
  @RequiresRole('member')
  async startDevice(
    @Param('provider') providerRaw: string,
    @Query('credential_name') credentialName: string | undefined,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<OAuthDeviceStartResponse> {
    const provider = requireProvider(providerRaw);
    const userId = requireUserId(user);
    return this.service.startDeviceConnect(
      provider,
      credentialName?.trim() || defaultCredentialName(provider),
      { userId, teamId: user?.teamId ?? undefined },
    );
  }

  /**
   * Poll a pending device authorization. The client may poll freely — the service
   * forwards to the provider at most once per its interval.
   */
  @Post(':provider/device/:deviceAuthId')
  @RequiresRole('member')
  async pollDevice(
    @Param('provider') providerRaw: string,
    @Param('deviceAuthId') deviceAuthId: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<OAuthDevicePollResponse> {
    requireProvider(providerRaw);
    // The grant is one-shot, so only the user who started this connect may consume it.
    const result = await this.service.pollDeviceConnect(deviceAuthId, requireUserId(user));
    return result.status === 'complete'
      ? { status: 'complete', credential: result.credential }
      : { status: result.status };
  }

  /**
   * Disconnect the acting user's connection. Always deletes locally; revokes at the
   * provider only when a client secret is configured (its revocation endpoint needs
   * Basic auth with one), and says which of those actually happened.
   */
  @Delete(':provider/connection')
  @RequiresRole('member')
  async disconnect(
    @Param('provider') providerRaw: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<OAuthDisconnectResponse> {
    const provider = requireProvider(providerRaw);
    return this.service.disconnect(provider, requireUserId(user));
  }
}

/**
 * Derive the gateway's base URL from the outgoing reply's request socket.
 * In Fastify, `reply.request` carries the raw IncomingMessage which has the host header.
 */
function deriveCallbackBase(reply: FastifyReply): string {
  const req = reply.request?.raw;
  const host = req?.headers?.host ?? 'localhost:7777';
  const proto = req?.headers?.['x-forwarded-proto'] ?? 'http';
  return `${(String(proto).split(',')[0] ?? 'http').trim()}://${host}`;
}

function requireProvider(raw: string): OAuthProvider {
  const parsed = OAuthProviderSchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestException(`Unknown OAuth provider: ${raw}`);
  return parsed.data;
}

/** A per-user credential needs a user. Auth-disabled installs have no owner to attribute
 *  it to, so the connect flow asks for a login rather than writing an unowned row that
 *  would read as install-wide. */
function requireUserId(user?: CurrentUserPayload | null): string {
  if (!user?.userId) {
    throw new UnauthorizedException('connecting an account requires a signed-in user');
  }
  return user.userId;
}

function defaultCredentialName(provider: OAuthProvider): string {
  return `${provider} connection`;
}
