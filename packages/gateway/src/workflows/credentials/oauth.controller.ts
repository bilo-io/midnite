import { BadRequestException, Controller, Get, Inject, Param, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { OAuthProviderSchema, OAuthStartParamsSchema } from '@midnite/shared';
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
