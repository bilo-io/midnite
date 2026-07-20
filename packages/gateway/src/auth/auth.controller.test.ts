import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@midnite/shared';
import type { UsersService } from '../users/users.service';
import type { TeamsService } from '../teams/teams.service';
import { AuthController } from './auth.controller';
import { JwtService, RefreshTokenRevokedError } from './jwt.service';

const USER: User = {
  id: 'usr_1',
  email: 'ada@example.com',
  name: 'Ada',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/**
 * Build an `AuthController` over hand-rolled fakes (no `@nestjs/testing`). `jwt`
 * lets a test flip `enabled` and stub the token methods; `users`/`teams` back the
 * happy path. These specs focus on the `/auth/refresh` contract — chiefly the
 * Phase 73 G regression: a JWT-disabled gateway must fail *cleanly* (400), never 500.
 */
function build(jwt: Partial<JwtService> & { enabled: boolean }) {
  const users = {
    getUser: vi.fn(() => USER),
    listIdentities: vi.fn(() => []),
  } as unknown as UsersService;
  const teams = {
    listTeamsForUser: vi.fn(() => []),
  } as unknown as TeamsService;
  const controller = new AuthController(users, jwt as unknown as JwtService, teams);
  return { controller, users, teams };
}

describe('AuthController /auth/refresh', () => {
  it('returns a clean 400 (not 500) when JWT auth is disabled', async () => {
    const { controller } = build({ enabled: false });
    // The deferred bug: a JWT-off gateway used to 500 here. It must be a clean
    // BadRequestException, and the guard must short-circuit before touching the body.
    await expect(controller.refresh({ refreshToken: 'anything' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a malformed body with 400 when JWT is enabled', async () => {
    const { controller } = build({ enabled: true });
    await expect(controller.refresh({ nope: true })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps a revoked/expired refresh token to 401', async () => {
    const { controller } = build({
      enabled: true,
      consumeRefreshToken: vi.fn(() => {
        throw new RefreshTokenRevokedError();
      }),
    });
    await expect(controller.refresh({ refreshToken: 'stale' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rotates tokens and returns the auth response on a valid refresh', async () => {
    const { controller } = build({
      enabled: true,
      consumeRefreshToken: vi.fn(() => USER.id),
      issueAccessToken: vi.fn(() => 'access.jwt'),
      issueRefreshToken: vi.fn(() => 'refresh.jwt'),
    });
    const res = await controller.refresh({ refreshToken: 'valid' });
    expect(res).toEqual({ accessToken: 'access.jwt', refreshToken: 'refresh.jwt', user: USER });
  });
});
