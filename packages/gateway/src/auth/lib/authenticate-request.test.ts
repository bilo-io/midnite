import { describe, expect, it, vi } from 'vitest';
import { authenticateRequest } from './authenticate-request';

const jwt = (accept: boolean) => ({
  enabled: true,
  verifyAccessToken: accept
    ? () => ({ sub: 'u1', email: 'a@b.c', teamId: 't1' })
    : () => {
        throw new Error('bad jwt');
      },
});

describe('authenticateRequest', () => {
  it('returns null when no credential is presented', () => {
    expect(authenticateRequest({}, { token: null })).toBeNull();
  });

  it('accepts a valid JWT and returns the user', () => {
    const res = authenticateRequest({ authorization: 'Bearer x' }, { token: null, jwtSvc: jwt(true) });
    expect(res).toEqual({ user: { userId: 'u1', email: 'a@b.c', teamId: 't1' } });
  });

  it('falls through from an invalid JWT to the static token', () => {
    const res = authenticateRequest(
      { authorization: 'Bearer secret' },
      { token: 'secret', jwtSvc: jwt(false) },
    );
    expect(res).toEqual({ user: null }); // static bearer authenticates but has no identity
  });

  it('accepts a service token and returns its principal', () => {
    const serviceTokens = { validate: vi.fn(() => ({ createdBy: 'svc-user', teamId: 'team-9' })) };
    const res = authenticateRequest(
      { authorization: 'Bearer mnt_abc' },
      { token: null, serviceTokens: serviceTokens as never },
    );
    expect(res).toEqual({ user: { userId: 'svc-user', email: '', teamId: 'team-9' } });
  });

  it('rejects a wrong static token', () => {
    expect(authenticateRequest({ authorization: 'Bearer nope' }, { token: 'secret' })).toBeNull();
  });

  it('ignores a bearer when no credential path is configured', () => {
    expect(authenticateRequest({ authorization: 'Bearer x' }, { token: null })).toBeNull();
  });
});
