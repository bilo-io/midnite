import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  type LoginProvider,
  LoginProviderSchema,
  type MidniteConfig,
  SsoExchangeRequestSchema,
  SsoStartParamsSchema,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import {
  EmailNotAllowlistedError,
  SsoEmailConflictError,
  SsoSignupClosedError,
} from '../users/users.service';
import { JwtService } from './jwt.service';
import {
  SsoNotConfiguredError,
  SsoProviderError,
  SsoService,
  SsoStateInvalidError,
} from './sso.service';

/**
 * Phase 70 C — SSO login endpoints. Thin: validate params, delegate to SsoService,
 * issue browser redirects (start/callback) or JSON (providers/exchange). Never puts
 * tokens in a URL — the callback 302s a one-time code to the web app, which exchanges
 * it server-side. Reachable pre-auth (see isAuthExemptPath). SSO needs JWT enabled;
 * the token-issuing endpoints 503 cleanly when it isn't (Decision §8).
 */
@Controller('auth/sso')
export class SsoController {
  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(SsoService) private readonly service: SsoService,
    @Inject(JwtService) private readonly jwtSvc: JwtService,
  ) {}

  /** Which providers the gateway is configured for — the web renders only usable buttons. */
  @Get('providers')
  providers(): { providers: LoginProvider[] } {
    return { providers: this.jwtSvc.enabled ? this.service.enabledProviders() : [] };
  }

  @Get(':provider/start')
  start(
    @Param('provider') providerRaw: string,
    @Query() query: unknown,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): void {
    const provider = this.parseProvider(providerRaw);
    if (!this.jwtSvc.enabled) throw new ServiceUnavailableException('SSO requires JWT auth to be enabled');
    const params = SsoStartParamsSchema.safeParse(query);
    if (!params.success) throw new BadRequestException(params.error.message);

    try {
      const url = this.service.buildAuthorizationUrl(provider, params.data.redirect, this.callbackBase(reply));
      void reply.redirect(url, 302);
    } catch (err) {
      if (err instanceof SsoNotConfiguredError) return this.toLogin(reply, 'provider_unavailable');
      throw err;
    }
  }

  @Get(':provider/callback')
  async callback(
    @Param('provider') providerRaw: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): Promise<void> {
    const provider = this.parseProvider(providerRaw);
    if (!this.jwtSvc.enabled) throw new ServiceUnavailableException('SSO requires JWT auth to be enabled');
    if (error) return this.toLogin(reply, 'access_denied');
    if (!code || !state) return this.toLogin(reply, 'invalid_callback');

    try {
      const { exchangeCode, redirect } = await this.service.handleCallback(
        provider,
        code,
        state,
        this.callbackBase(reply),
      );
      const dest = new URL(`${this.webBase(reply)}/auth/sso/callback`);
      dest.searchParams.set('code', exchangeCode);
      dest.searchParams.set('redirect', redirect);
      void reply.redirect(dest.toString(), 302);
    } catch (err) {
      return this.toLogin(reply, this.errorCode(err));
    }
  }

  @Post('exchange')
  exchange(@Body() body: unknown) {
    if (!this.jwtSvc.enabled) throw new ServiceUnavailableException('SSO requires JWT auth to be enabled');
    const parsed = SsoExchangeRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return this.service.exchangeCode(parsed.data.code);
    } catch (err) {
      if (err instanceof SsoStateInvalidError) throw new BadRequestException('invalid or expired exchange code');
      throw err;
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  private parseProvider(raw: string): LoginProvider {
    const parsed = LoginProviderSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(`Unknown SSO provider: ${raw}`);
    return parsed.data;
  }

  /** Map a callback failure to a safe, fixed `sso_error` code (no internals leak). */
  private errorCode(err: unknown): string {
    if (err instanceof SsoStateInvalidError) return 'invalid_state';
    if (err instanceof EmailNotAllowlistedError) return 'not_allowed';
    if (err instanceof SsoSignupClosedError) return 'signup_closed';
    if (err instanceof SsoEmailConflictError) return 'email_conflict';
    if (err instanceof SsoNotConfiguredError) return 'provider_unavailable';
    if (err instanceof SsoProviderError) return 'provider_error';
    throw err instanceof Error ? err : new Error('unknown SSO callback error');
  }

  private toLogin(reply: FastifyReply, ssoError: string): void {
    const dest = new URL(`${this.webBase(reply)}/login`);
    dest.searchParams.set('sso_error', ssoError);
    void reply.redirect(dest.toString(), 302);
  }

  /** Request-derived gateway origin (the service applies any per-provider pinned redirectUri). */
  private callbackBase(reply: FastifyReply): string {
    return deriveOrigin(reply);
  }

  /** Web app origin to send the browser back to — config `webBaseUrl` else request origin. */
  private webBase(reply: FastifyReply): string {
    return (this.config.gateway.auth.sso?.webBaseUrl ?? deriveOrigin(reply)).replace(/\/+$/, '');
  }
}

function deriveOrigin(reply: FastifyReply): string {
  const req = reply.request?.raw;
  const host = req?.headers?.host ?? 'localhost:7777';
  const proto = req?.headers?.['x-forwarded-proto'] ?? 'http';
  return `${(String(proto).split(',')[0] ?? 'http').trim()}://${host}`;
}
