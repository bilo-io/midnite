import { describe, expect, it, vi } from 'vitest';

import type { WorkflowCredential, WorkflowCredentialData } from '@midnite/shared';

import type { WorkflowCredentialsService } from '../workflows/credentials/workflow-credentials.service';
import { GithubTokenService, type ExecFileFn } from './github-token.service';

// The ladder's *order* is the contract — a first-match-wins lookup is the bug this
// service exists to avoid (see `pr-review.service.ts`'s `githubToken()`), so every test
// here is about which rung answers, not merely that some token comes back.

function credential(id: string, type: WorkflowCredential['type']): WorkflowCredential {
  return {
    id,
    name: `${type} credential`,
    type,
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  };
}

/**
 * `owned` is the acting user's *own* `github-oauth` connection — rung 1 of the ladder.
 * Kept separate from `rows`/`resolved` (the install-wide vault) precisely because the
 * distinction is the thing under test: a shared PAT must never satisfy rung 1.
 */
function fakeVault(
  rows: WorkflowCredential[],
  resolved: Record<string, WorkflowCredentialData>,
  owned?: Record<string, WorkflowCredentialData>,
): WorkflowCredentialsService {
  return {
    list: vi.fn(() => rows),
    resolve: vi.fn(async (id: string) => resolved[id] ?? null),
    resolveOwnedByType: vi.fn(async (userId: string, type: string) => {
      const data = owned?.[`${userId}:${type}`];
      return data ? { id: `owned-${userId}`, name: 'connection', data } : null;
    }),
  } as unknown as WorkflowCredentialsService;
}

const CONNECTION: WorkflowCredentialData = {
  type: 'github-oauth',
  accessToken: 'user-token',
  scope: 'repo project read:org',
};

const ghCli = (token: string | null): ExecFileFn =>
  vi.fn(async () => {
    if (token === null) throw new Error('gh: not logged in');
    return { stdout: `${token}\n` };
  });

describe('GithubTokenService', () => {
  it('prefers the acting user\'s own connection over an install-wide PAT', async () => {
    // Rung 1. The whole reason the ladder is ordered rather than a `find()`.
    const vault = fakeVault(
      [credential('c1', 'github')],
      { c1: { type: 'github', token: 'pat-token' } },
      { 'user-1:github-oauth': CONNECTION },
    );
    const service = new GithubTokenService(vault, ghCli('cli-token'));

    await expect(service.resolve('user-1')).resolves.toEqual({
      token: 'user-token',
      source: 'oauth',
    });
  });

  it('does not use another user\'s connection', async () => {
    const vault = fakeVault([], {}, { 'user-1:github-oauth': CONNECTION });
    const service = new GithubTokenService(vault, ghCli('cli-token'));
    await expect(service.resolve('user-2')).resolves.toEqual({ token: 'cli-token', source: 'gh-cli' });
  });

  it('skips rung 1 entirely when there is no acting user', async () => {
    // An unauthenticated/static-token call has no personal connection to prefer.
    const vault = fakeVault([], {}, { 'user-1:github-oauth': CONNECTION });
    const service = new GithubTokenService(vault, ghCli('cli-token'));
    await expect(service.resolve()).resolves.toEqual({ token: 'cli-token', source: 'gh-cli' });
  });

  it('resolves the shared vault PAT and reports it as a PAT, not a personal connection', async () => {
    // A shared PAT must never read as "your GitHub is connected" — the UI branches on
    // `source` to say so honestly.
    const vault = fakeVault([credential('c1', 'github')], {
      c1: { type: 'github', token: 'pat-token' },
    });
    const service = new GithubTokenService(vault, ghCli('cli-token'));

    await expect(service.resolve('user-1')).resolves.toEqual({
      token: 'pat-token',
      source: 'pat',
    });
  });

  it('falls through to the gh CLI when the vault holds no GitHub credential', async () => {
    const service = new GithubTokenService(fakeVault([credential('c1', 'slack')], {}), ghCli('cli-token'));
    await expect(service.resolve()).resolves.toEqual({ token: 'cli-token', source: 'gh-cli' });
  });

  it('falls through to the gh CLI when the vault row cannot be decrypted', async () => {
    // `resolve()` returns null for a missing key or a corrupt blob. That is not a fatal
    // error for discovery — the next rung may still work.
    const vault = fakeVault([credential('c1', 'github')], {});
    const service = new GithubTokenService(vault, ghCli('cli-token'));
    await expect(service.resolve()).resolves.toEqual({ token: 'cli-token', source: 'gh-cli' });
  });

  it('returns null when no rung answers', async () => {
    const service = new GithubTokenService(fakeVault([], {}), ghCli(null));
    await expect(service.resolve('user-1')).resolves.toBeNull();
  });

  it('treats a blank gh CLI token as no token', async () => {
    const service = new GithubTokenService(fakeVault([], {}), vi.fn(async () => ({ stdout: '\n' })));
    await expect(service.resolve()).resolves.toBeNull();
  });

  it('never lets a failing gh CLI throw out of resolve', async () => {
    const exploding: ExecFileFn = vi.fn(async () => {
      throw Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
    });
    const service = new GithubTokenService(fakeVault([], {}), exploding);
    await expect(service.resolve()).resolves.toBeNull();
  });
});
