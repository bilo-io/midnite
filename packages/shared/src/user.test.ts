import { describe, expect, it } from 'vitest';

import {
  AuthResponseSchema,
  LOGIN_PROVIDERS,
  LoginProviderSchema,
  SsoExchangeRequestSchema,
  SsoIdentitySchema,
  SsoProvidersResponseSchema,
  SsoRedirectPathSchema,
  SsoStartParamsSchema,
  UserSchema,
} from './user.js';

describe('LoginProviderSchema', () => {
  it('accepts the two login providers', () => {
    expect(LoginProviderSchema.parse('google')).toBe('google');
    expect(LoginProviderSchema.parse('github')).toBe('github');
    expect(LOGIN_PROVIDERS).toEqual(['google', 'github']);
  });

  it('rejects vault-only / unknown providers', () => {
    // `slack` is a credential-vault provider, deliberately NOT a login provider.
    expect(LoginProviderSchema.safeParse('slack').success).toBe(false);
    expect(LoginProviderSchema.safeParse('gitlab').success).toBe(false);
  });
});

describe('UserSchema.identities', () => {
  const base = {
    id: 'u1',
    email: 'a@x.com',
    name: 'Ada',
    createdAt: '2026-07-18T00:00:00.000Z',
    updatedAt: '2026-07-18T00:00:00.000Z',
  };

  it('stays valid with no identities (backward-compatible with pre-SSO rows)', () => {
    const user = UserSchema.parse(base);
    expect(user.identities).toBeUndefined();
  });

  it('parses linked identities', () => {
    const user = UserSchema.parse({
      ...base,
      identities: [{ provider: 'github', email: 'a@x.com' }],
    });
    expect(user.identities).toEqual([{ provider: 'github', email: 'a@x.com' }]);
  });

  it('stays valid with no avatarUrl (backward-compatible with pre-avatar rows)', () => {
    expect(UserSchema.parse(base).avatarUrl).toBeUndefined();
  });

  it('parses an avatarUrl and rejects a non-URL value', () => {
    expect(UserSchema.parse({ ...base, avatarUrl: 'https://cdn.example.com/a.png' }).avatarUrl).toBe(
      'https://cdn.example.com/a.png',
    );
    expect(UserSchema.safeParse({ ...base, avatarUrl: 'not-a-url' }).success).toBe(false);
  });

  it('rejects an identity with a non-login provider', () => {
    expect(
      UserSchema.safeParse({ ...base, identities: [{ provider: 'slack', email: 'a@x.com' }] })
        .success,
    ).toBe(false);
  });
});

describe('SsoIdentitySchema', () => {
  it('requires a valid email', () => {
    expect(SsoIdentitySchema.safeParse({ provider: 'google', email: 'nope' }).success).toBe(false);
  });
});

describe('SsoRedirectPathSchema (open-redirect guard)', () => {
  it('accepts same-origin relative paths', () => {
    for (const p of ['/', '/board', '/tasks/abc?x=1', '/a/b/c']) {
      expect(SsoRedirectPathSchema.parse(p)).toBe(p);
    }
  });

  it('rejects absolute, protocol-relative, and backslash paths', () => {
    for (const p of [
      'https://evil.com',
      'http://evil.com/x',
      '//evil.com',
      'evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
    ]) {
      expect(SsoRedirectPathSchema.safeParse(p).success).toBe(false);
    }
  });
});

describe('SsoStartParamsSchema', () => {
  it('allows an absent redirect', () => {
    expect(SsoStartParamsSchema.parse({})).toEqual({});
  });

  it('carries a valid redirect through and rejects a bad one', () => {
    expect(SsoStartParamsSchema.parse({ redirect: '/board' })).toEqual({ redirect: '/board' });
    expect(SsoStartParamsSchema.safeParse({ redirect: 'http://evil.com' }).success).toBe(false);
  });
});

describe('SsoExchangeRequestSchema', () => {
  it('requires a non-empty code', () => {
    expect(SsoExchangeRequestSchema.parse({ code: 'abc123' })).toEqual({ code: 'abc123' });
    expect(SsoExchangeRequestSchema.safeParse({ code: '' }).success).toBe(false);
  });
});

describe('SsoProvidersResponseSchema', () => {
  it('validates the configured-providers list', () => {
    expect(SsoProvidersResponseSchema.parse({ providers: ['google', 'github'] })).toEqual({
      providers: ['google', 'github'],
    });
    expect(SsoProvidersResponseSchema.safeParse({ providers: ['slack'] }).success).toBe(false);
  });
});

describe('AuthResponseSchema (reused unchanged for SSO exchange)', () => {
  it('still validates a token+user payload', () => {
    const res = AuthResponseSchema.parse({
      accessToken: 'a',
      refreshToken: 'r',
      user: {
        id: 'u1',
        email: 'a@x.com',
        name: 'Ada',
        createdAt: '2026-07-18T00:00:00.000Z',
        updatedAt: '2026-07-18T00:00:00.000Z',
      },
    });
    expect(res.accessToken).toBe('a');
  });
});
