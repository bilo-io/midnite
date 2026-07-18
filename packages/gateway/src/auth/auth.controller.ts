import { BadRequestException, Body, Controller, ForbiddenException, Get, Optional, Post, UnauthorizedException } from '@nestjs/common';
import {
  AuthResponseSchema,
  CreateUserRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  UserSchema,
} from '@midnite/shared';
import { AuditService } from '../audit/audit.service';
import {
  UsersService,
  UserAlreadyExistsError,
  InvalidCredentialsError,
  PasswordLoginUnavailableError,
} from '../users/users.service';
import { TeamsService } from '../teams/teams.service';
import { JwtService, RefreshTokenRevokedError, TokenInvalidError } from './jwt.service';
import { CurrentUser } from './decorators/current-user.decorator';

type AuthenticatedUser = { userId: string; email: string; teamId: string | null } | null;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly jwtSvc: JwtService,
    private readonly teams: TeamsService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  private primaryTeamId(userId: string): string | null {
    return this.teams.listTeamsForUser(userId)[0]?.id ?? null;
  }

  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = CreateUserRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const { email, name, password } = parsed.data;
    try {
      const user = await this.users.register(email, name, password);
      if (!this.jwtSvc.enabled) {
        return { user: UserSchema.parse(user) };
      }
      const teamId = this.primaryTeamId(user.id);
      const accessToken = this.jwtSvc.issueAccessToken(user.id, user.email, teamId);
      const refreshToken = this.jwtSvc.issueRefreshToken(user.id);
      return AuthResponseSchema.parse({ accessToken, refreshToken, user });
    } catch (err) {
      if (err instanceof UserAlreadyExistsError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const parsed = LoginRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const { email, password } = parsed.data;
    try {
      const user = await this.users.validateCredentials(email, password);
      this.audit?.record({ entityType: 'user', entityId: user.id, userId: user.id, action: 'user.login' });
      if (!this.jwtSvc.enabled) {
        return { user: UserSchema.parse(user) };
      }
      const teamId = this.primaryTeamId(user.id);
      const accessToken = this.jwtSvc.issueAccessToken(user.id, user.email, teamId);
      const refreshToken = this.jwtSvc.issueRefreshToken(user.id);
      return AuthResponseSchema.parse({ accessToken, refreshToken, user });
    } catch (err) {
      // A pure-SSO account tried to password-login: 403 with a provider hint,
      // distinct from the generic 401 for a bad password (Phase 70 B).
      if (err instanceof PasswordLoginUnavailableError) throw new ForbiddenException(err.message);
      if (err instanceof InvalidCredentialsError) throw new UnauthorizedException(err.message);
      throw err;
    }
  }

  @Post('refresh')
  async refresh(@Body() body: unknown) {
    if (!this.jwtSvc.enabled) throw new BadRequestException('JWT auth is not enabled');
    const parsed = RefreshRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      const userId = this.jwtSvc.consumeRefreshToken(parsed.data.refreshToken);
      const user = this.users.getUser(userId);
      const teamId = this.primaryTeamId(userId);
      const accessToken = this.jwtSvc.issueAccessToken(user.id, user.email, teamId);
      const refreshToken = this.jwtSvc.issueRefreshToken(user.id);
      return AuthResponseSchema.parse({ accessToken, refreshToken, user });
    } catch (err) {
      if (err instanceof RefreshTokenRevokedError) throw new UnauthorizedException(err.message);
      throw err;
    }
  }

  @Post('logout')
  logout(@CurrentUser() currentUser: AuthenticatedUser) {
    if (currentUser?.userId) {
      this.jwtSvc.revokeAllForUser(currentUser.userId);
      this.audit?.record({ entityType: 'user', entityId: currentUser.userId, userId: currentUser.userId, action: 'user.logout' });
    }
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() currentUser: AuthenticatedUser) {
    if (!currentUser?.userId) throw new UnauthorizedException('not authenticated');
    try {
      return { user: UserSchema.parse(this.users.getUser(currentUser.userId)) };
    } catch (err) {
      if (err instanceof TokenInvalidError) throw new UnauthorizedException('not authenticated');
      throw err;
    }
  }
}
