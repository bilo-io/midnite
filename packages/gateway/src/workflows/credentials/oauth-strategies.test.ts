import { describe, expect, it } from 'vitest';

import {
  GITHUB_CONNECT_SCOPES,
  OAUTH_STRATEGIES,
  resolveGrant,
  scopeStringFor,
} from './oauth-strategies';

// The table replaced `if google … else slack`. Google's and Slack's entries must be
// byte-for-byte what those branches produced — a refactor that quietly changes a scope
// separator or drops `access_type=offline` breaks a working integration silently.

describe('OAUTH_STRATEGIES — google/slack parity with the branches they replaced', () => {
  it('keeps Google\'s URLs, space-separated scopes and refresh-token params', () => {
    const google = OAUTH_STRATEGIES.google;
    expect(google.authUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(google.tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(google.scopeSeparator).toBe(' ');
    // Dropping either of these is how you silently stop getting a refresh token.
    expect(google.extraAuthParams).toMatchObject({ access_type: 'offline', prompt: 'consent' });
    expect(google.preferredGrant).toBe('redirect');
  });

  it('keeps Slack\'s URLs and comma-separated scopes', () => {
    const slack = OAUTH_STRATEGIES.slack;
    expect(slack.authUrl).toBe('https://slack.com/oauth/v2/authorize');
    expect(slack.tokenUrl).toBe('https://slack.com/api/oauth.v2.access');
    expect(slack.scopeSeparator).toBe(',');
    expect(slack.preferredGrant).toBe('redirect');
  });

  it('leaves both existing providers on the redirect grant', () => {
    // Only GitHub gains a device grant in this phase; google/slack behaviour is untouched.
    expect(OAUTH_STRATEGIES.google.preferredGrant).toBe('redirect');
    expect(OAUTH_STRATEGIES.slack.preferredGrant).toBe('redirect');
    expect(OAUTH_STRATEGIES.github.preferredGrant).toBe('device');
  });
});

describe('parseToken', () => {
  it('builds a google-oauth payload with an absolute expiry', () => {
    const parsed = OAUTH_STRATEGIES.google.parseToken({
      access_token: 'ya29',
      refresh_token: 'r',
      expires_in: 3600,
      scope: 'drive.file',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toMatchObject({ type: 'google-oauth', accessToken: 'ya29', refreshToken: 'r' });
    expect(Date.parse((parsed.data as { expiresAt: string }).expiresAt)).toBeGreaterThan(Date.now());
  });

  it('treats Slack\'s ok:false as a failure even on an HTTP 200', () => {
    const parsed = OAUTH_STRATEGIES.slack.parseToken({ ok: false, error: 'invalid_code' });
    expect(parsed).toEqual({ ok: false, error: 'Slack OAuth error: invalid_code' });
  });

  it('requires Slack\'s team id, not just a token', () => {
    const parsed = OAUTH_STRATEGIES.slack.parseToken({ ok: true, access_token: 'xoxb' });
    expect(parsed.ok).toBe(false);
  });

  it('leaves a GitHub token\'s expiry and refresh token undefined when absent', () => {
    // The overwhelmingly common shape: OAuth App tokens don't expire unless the app
    // opted in. Coercing these to '' would make the credential look refreshable.
    const parsed = OAUTH_STRATEGIES.github.parseToken({ access_token: 'gho_x', scope: 'repo' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toEqual({
      type: 'github-oauth',
      accessToken: 'gho_x',
      refreshToken: undefined,
      expiresAt: undefined,
      scope: 'repo',
    });
  });

  it('records an expiry for a GitHub app that opted into expiring tokens', () => {
    const parsed = OAUTH_STRATEGIES.github.parseToken({
      access_token: 'gho_x',
      refresh_token: 'ghr_x',
      expires_in: 28800,
      scope: 'repo',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toMatchObject({ refreshToken: 'ghr_x' });
    expect((parsed.data as { expiresAt?: string }).expiresAt).toBeTruthy();
  });

  it('reports a GitHub error field rather than storing a tokenless credential', () => {
    const parsed = OAUTH_STRATEGIES.github.parseToken({ error: 'bad_verification_code' });
    expect(parsed).toEqual({ ok: false, error: 'GitHub OAuth error: bad_verification_code' });
  });
});

describe('scopeStringFor', () => {
  it('joins with each provider\'s own separator', () => {
    expect(scopeStringFor('github')).toBe('repo project read:org');
    expect(scopeStringFor('slack', ['channels:read', 'chat:write'])).toBe('channels:read,chat:write');
    expect(scopeStringFor('google', ['a', 'b'])).toBe('a b');
  });

  it('falls back to the provider defaults when the operator configures none', () => {
    expect(scopeStringFor('github', [])).toBe(GITHUB_CONNECT_SCOPES.join(' '));
    expect(scopeStringFor('google', undefined)).toBe('https://www.googleapis.com/auth/drive.file');
  });

  it('asks GitHub for repo, project and read:org in one consent screen', () => {
    // Decision §3 — a connection that can browse repos but can't write to a Project is
    // worse than one honest prompt.
    expect(GITHUB_CONNECT_SCOPES).toEqual(['repo', 'project', 'read:org']);
  });
});

describe('resolveGrant', () => {
  it('uses device for GitHub on a bare install (no operator config at all)', () => {
    expect(resolveGrant('github', undefined)).toBe('device');
  });

  it('still uses device when a clientId is set but its secret is not', () => {
    // A half-configured redirect app must not become the connect path — it would fail at
    // the first authorize URL. `midnite doctor` is what tells the operator about it.
    expect(resolveGrant('github', { clientId: 'my-app', hasSecret: false })).toBe('device');
  });

  it('prefers redirect once a clientId AND a resolvable secret exist', () => {
    expect(resolveGrant('github', { clientId: 'my-app', hasSecret: true })).toBe('redirect');
  });

  it('leaves google and slack on redirect regardless of configuration', () => {
    expect(resolveGrant('google', undefined)).toBe('redirect');
    expect(resolveGrant('slack', { clientId: 'x', hasSecret: false })).toBe('redirect');
  });
});
