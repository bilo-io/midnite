import { BadRequestException, Body, Controller, Get, HttpCode, Optional, Patch, Post, UnauthorizedException } from '@nestjs/common';
import {
  AuthResponseSchema,
  CreateUserRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  UpdatePasswordRequestSchema,
  UpdateUserRequestSchema,
  UserSchema,
} from '@midnite/shared';
import { AuditService } from '../audit/audit.service';
import { UsersService, UserAlreadyExistsError, InvalidCredentialsError } from '../users/users.service';
import { JwtService, RefreshTokenRevokedError, TokenInvalidError } from './jwt.service';
import { CurrentUser } from './decorators/current-user.decorator';

type AuthenticatedUser = { userId: string; email: string } | null;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly jwtSvc: JwtService,
    @Optional() private readonly audit?: AuditService,
  ) {}

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
      const accessToken = this.jwtSvc.issueAccessToken(user.id, user.email);
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
      const accessToken = this.jwtSvc.issueAccessToken(user.id, user.email);
      const refreshToken = this.jwtSvc.issueRefreshToken(user.id);
      return AuthResponseSchema.parse({ accessToken, refreshToken, user });
    } catch (err) {
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
      const accessToken = this.jwtSvc.issueAccessToken(user.id, user.email);
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

  @Patch('me')
  async updateMe(@CurrentUser() currentUser: AuthenticatedUser, @Body() body: unknown) {
    if (!currentUser?.userId) throw new UnauthorizedException('not authenticated');
    const parsed = UpdateUserRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const user = await this.users.updateProfile(currentUser.userId, parsed.data.name);
    return { user: UserSchema.parse(user) };
  }

  @Patch('me/password')
  @HttpCode(204)
  async updatePassword(@CurrentUser() currentUser: AuthenticatedUser, @Body() body: unknown) {
    if (!currentUser?.userId) throw new UnauthorizedException('not authenticated');
    const parsed = UpdatePasswordRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      await this.users.updatePassword(currentUser.userId, parsed.data.currentPassword, parsed.data.newPassword);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) throw new BadRequestException('current password is incorrect');
      throw err;
    }
  }
}
