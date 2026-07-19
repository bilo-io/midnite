import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { MidniteConfig } from '@midnite/shared';
import { OperatorGuard } from './operator.guard';

// Minimal ExecutionContext builder — enough for OperatorGuard's HTTP path.
function makeCtx(user?: { userId: string; email: string; teamId: string | null } | null): ExecutionContext {
  const req: Record<string, unknown> = {};
  if (user !== undefined) req['user'] = user;
  return {
    getType: () => 'http',
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeGuard(required: boolean | undefined, operators: string[]): OperatorGuard {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(required) } as unknown as Reflector;
  const config = { gateway: { auth: { operators } } } as unknown as MidniteConfig;
  return new OperatorGuard(reflector, config);
}

const OP = { userId: 'u1', email: 'ops@example.com', teamId: null };

describe('OperatorGuard', () => {
  it('is a no-op on routes without @RequiresOperator', () => {
    const guard = makeGuard(undefined, []);
    expect(guard.canActivate(makeCtx())).toBe(true);
  });

  it('throws 401 when there is no authenticated user (anon / auth-off)', () => {
    const guard = makeGuard(true, ['ops@example.com']);
    expect(() => guard.canActivate(makeCtx())).toThrow(UnauthorizedException);
  });

  it('throws 403 when the user is authenticated but not an operator', () => {
    const guard = makeGuard(true, ['ops@example.com']);
    const ctx = makeCtx({ userId: 'u2', email: 'member@example.com', teamId: 't1' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 for everyone when the operators list is empty (fail-closed)', () => {
    const guard = makeGuard(true, []);
    expect(() => guard.canActivate(makeCtx(OP))).toThrow(ForbiddenException);
  });

  it('passes for an allowlisted operator (case-insensitive)', () => {
    const guard = makeGuard(true, ['Ops@Example.COM']);
    expect(guard.canActivate(makeCtx(OP))).toBe(true);
  });
});
