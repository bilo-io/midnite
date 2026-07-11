/**
 * Integration node executor unit tests (Phase 14 Theme C).
 *
 * Tests use mocked fetch / nodemailer transport so no real network calls are
 * made. The credential service is replaced with a lightweight fake that returns
 * a pre-built credential data object.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { WorkflowCredentialData } from '@midnite/shared';
import type { WorkflowCredentialsService } from '../../credentials/workflow-credentials.service';
import { SlackMessageExecutor } from './slack-message.executor';
import { EmailSendExecutor } from './email-send.executor';
import { GithubGetPrExecutor } from './github-get-pr.executor';
import { GithubGetDiffExecutor } from './github-get-diff.executor';
import { GithubPostReviewExecutor } from './github-post-review.executor';
import type { NodeRunContext } from '../node-executor';

// ---- helpers ---------------------------------------------------------------

function fakeCredentials(data: WorkflowCredentialData | null): WorkflowCredentialsService {
  return { resolve: (_id: string) => Promise.resolve(data) } as unknown as WorkflowCredentialsService;
}

function makeCtx(params: Record<string, unknown>): NodeRunContext {
  return {
    params,
    input: {},
    signal: new AbortController().signal,
    log: vi.fn(),
  } as unknown as NodeRunContext;
}

// ---- SlackMessageExecutor --------------------------------------------------

describe('SlackMessageExecutor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws when the credential is not found', async () => {
    const exec = new SlackMessageExecutor(fakeCredentials(null));
    const ctx = makeCtx({ credentialId: 'missing', channel: '#general', text: 'hi' });
    await expect(exec.execute(ctx)).rejects.toThrow(/not found or could not be decrypted/);
  });

  it('throws when the credential type is wrong', async () => {
    const exec = new SlackMessageExecutor(
      fakeCredentials({ type: 'http-bearer', token: 'tok' }),
    );
    const ctx = makeCtx({ credentialId: 'c1', channel: '#general', text: 'hi' });
    await expect(exec.execute(ctx)).rejects.toThrow(/expected a 'slack' credential/);
  });

  it('calls chat.postMessage and returns ok + ts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, ts: '123.456', channel: 'C1234' }),
      }),
    );

    const exec = new SlackMessageExecutor(
      fakeCredentials({ type: 'slack', token: 'xoxb-test' }),
    );
    const result = await exec.execute(makeCtx({ credentialId: 'c1', channel: '#general', text: 'hello' }));
    expect(result).toEqual({ ok: true, ts: '123.456', channel: 'C1234' });

    const [url, opts] = (vi.mocked(fetch) as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect((opts.headers as Record<string, string>)['authorization']).toBe('Bearer xoxb-test');
    const body = JSON.parse(opts.body as string) as { channel: string; text: string };
    expect(body).toEqual({ channel: '#general', text: 'hello' });
  });

  it('includes Block Kit blocks in the payload when provided (text is the fallback)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, ts: '1', channel: 'C1' }) }),
    );
    const exec = new SlackMessageExecutor(fakeCredentials({ type: 'slack', token: 'tok' }));
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: '*Digest*' } }];
    await exec.execute(makeCtx({ credentialId: 'c1', channel: '#d', text: 'fallback', blocks }));

    const [, opts] = (vi.mocked(fetch) as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { channel: string; text: string; blocks?: unknown };
    expect(body).toEqual({ channel: '#d', text: 'fallback', blocks });
  });

  it('skips cleanly (never resolves the credential or posts) when the slot is unbound', async () => {
    const resolve = vi.fn();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const exec = new SlackMessageExecutor({ resolve } as unknown as WorkflowCredentialsService);

    const result = await exec.execute(
      makeCtx({ credentialId: 'slot:slack-workspace', channel: '#d', text: 'hi' }),
    );
    expect(result).toMatchObject({ skipped: true, reason: 'unbound-credential-slot' });
    expect(resolve).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws when Slack API returns ok: false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false, error: 'channel_not_found' }),
      }),
    );
    const exec = new SlackMessageExecutor(fakeCredentials({ type: 'slack', token: 'tok' }));
    await expect(exec.execute(makeCtx({ credentialId: 'c1', channel: '#bad', text: 'hi' }))).rejects.toThrow(
      /channel_not_found/,
    );
  });
});

// ---- EmailSendExecutor -----------------------------------------------------

describe('EmailSendExecutor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws when the credential is not found', async () => {
    const exec = new EmailSendExecutor(fakeCredentials(null));
    const ctx = makeCtx({ credentialId: 'x', to: 'a@b.com', subject: 'Hi', text: 'body' });
    await expect(exec.execute(ctx)).rejects.toThrow(/not found or could not be decrypted/);
  });

  it('throws when the credential type is wrong', async () => {
    const exec = new EmailSendExecutor(fakeCredentials({ type: 'slack', token: 'tok' }));
    const ctx = makeCtx({ credentialId: 'x', to: 'a@b.com', subject: 'Hi', text: 'body' });
    await expect(exec.execute(ctx)).rejects.toThrow(/expected an 'smtp' credential/);
  });

  it('calls sendMail and returns ok + messageId', async () => {
    // Stub nodemailer at the module level.
    vi.mock('nodemailer', () => ({
      default: {
        createTransport: () => ({
          sendMail: vi.fn().mockResolvedValue({
            messageId: '<abc@example.com>',
            accepted: ['dest@example.com'],
          }),
        }),
      },
    }));

    const { EmailSendExecutor: Fresh } = await import('./email-send.executor');
    const smtpCred: WorkflowCredentialData = {
      type: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      username: 'user',
      password: 'pass',
    };
    const exec = new Fresh(fakeCredentials(smtpCred));
    const result = await exec.execute(
      makeCtx({ credentialId: 'c1', to: 'dest@example.com', subject: 'Hello', text: 'World' }),
    );
    expect(result).toMatchObject({ ok: true, messageId: '<abc@example.com>' });
  });
});

// ---- GithubGetPrExecutor ---------------------------------------------------

const PR_URL = 'https://github.com/owner/repo/pull/42';

describe('GithubGetPrExecutor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws when the credential is not found', async () => {
    const exec = new GithubGetPrExecutor(fakeCredentials(null));
    await expect(exec.execute(makeCtx({ credentialId: 'x', prUrl: PR_URL }))).rejects.toThrow(
      /not found or could not be decrypted/,
    );
  });

  it('throws when the credential type is wrong', async () => {
    const exec = new GithubGetPrExecutor(fakeCredentials({ type: 'slack', token: 'tok' }));
    await expect(exec.execute(makeCtx({ credentialId: 'x', prUrl: PR_URL }))).rejects.toThrow(
      /expected a 'github' credential/,
    );
  });

  it('throws when the PR URL cannot be parsed', async () => {
    const exec = new GithubGetPrExecutor(fakeCredentials({ type: 'github', token: 'ghp_test' }));
    await expect(
      exec.execute(makeCtx({ credentialId: 'x', prUrl: 'https://github.com/bad' })),
    ).rejects.toThrow(/cannot parse GitHub PR URL/);
  });

  it('fetches PR metadata and returns a structured object', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          number: 42,
          title: 'Fix the bug',
          body: 'Details here',
          state: 'open',
          html_url: PR_URL,
          user: { login: 'octocat' },
          labels: [{ name: 'bug' }],
          head: { ref: 'fix/the-bug', sha: 'abc123' },
          base: { ref: 'main' },
          additions: 10,
          deletions: 3,
          changed_files: 2,
        }),
      }),
    );

    const exec = new GithubGetPrExecutor(fakeCredentials({ type: 'github', token: 'ghp_test' }));
    const result = await exec.execute(makeCtx({ credentialId: 'c1', prUrl: PR_URL }));

    expect(result).toMatchObject({
      number: 42,
      title: 'Fix the bug',
      author: 'octocat',
      labels: ['bug'],
      headBranch: 'fix/the-bug',
      baseBranch: 'main',
    });

    const [url, opts] = (vi.mocked(fetch) as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/owner/repo/pulls/42');
    expect((opts.headers as Record<string, string>)['authorization']).toBe('Bearer ghp_test');
  });

  it('throws on a non-ok GitHub response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found', text: async () => '' }),
    );
    const exec = new GithubGetPrExecutor(fakeCredentials({ type: 'github', token: 'ghp_test' }));
    await expect(exec.execute(makeCtx({ credentialId: 'c1', prUrl: PR_URL }))).rejects.toThrow(/404/);
  });
});

// ---- GithubGetDiffExecutor -------------------------------------------------

describe('GithubGetDiffExecutor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws when the credential is not found', async () => {
    const exec = new GithubGetDiffExecutor(fakeCredentials(null));
    await expect(exec.execute(makeCtx({ credentialId: 'x', prUrl: PR_URL }))).rejects.toThrow(
      /not found or could not be decrypted/,
    );
  });

  it('returns the diff and metadata when within maxTokens', async () => {
    const fakeDiff = 'diff --git a/foo.ts b/foo.ts\n+const x = 1;\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => fakeDiff }));

    const exec = new GithubGetDiffExecutor(fakeCredentials({ type: 'github', token: 'ghp_test' }));
    const result = (await exec.execute(
      makeCtx({ credentialId: 'c1', prUrl: PR_URL }),
    )) as { diff: string; truncated: boolean; estimatedTokens: number };

    expect(result.diff).toBe(fakeDiff);
    expect(result.truncated).toBe(false);
    expect(typeof result.estimatedTokens).toBe('number');
  });

  it('truncates the diff when it exceeds maxTokens', async () => {
    const longDiff = 'x'.repeat(100);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => longDiff }));

    const exec = new GithubGetDiffExecutor(fakeCredentials({ type: 'github', token: 'ghp_test' }));
    const result = (await exec.execute(
      makeCtx({ credentialId: 'c1', prUrl: PR_URL, maxTokens: 5 }),
    )) as { diff: string; truncated: boolean };

    expect(result.truncated).toBe(true);
    expect(result.diff).toContain('[diff truncated');
    expect(result.diff.length).toBeLessThan(longDiff.length);
  });
});

// ---- GithubPostReviewExecutor ----------------------------------------------

describe('GithubPostReviewExecutor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws when the credential is not found', async () => {
    const exec = new GithubPostReviewExecutor(fakeCredentials(null));
    await expect(
      exec.execute(makeCtx({ credentialId: 'x', prUrl: PR_URL, body: 'LGTM' })),
    ).rejects.toThrow(/not found or could not be decrypted/);
  });

  it('posts a review and returns reviewId + htmlUrl', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 999, html_url: `${PR_URL}#pullrequestreview-999`, state: 'COMMENTED' }),
      }),
    );

    const exec = new GithubPostReviewExecutor(fakeCredentials({ type: 'github', token: 'ghp_test' }));
    const result = await exec.execute(makeCtx({ credentialId: 'c1', prUrl: PR_URL, body: 'LGTM' }));

    expect(result).toMatchObject({ reviewId: 999, state: 'COMMENTED' });

    const [url, opts] = (vi.mocked(fetch) as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/owner/repo/pulls/42/reviews');
    const body = JSON.parse(opts.body as string) as { body: string; event: string };
    expect(body.event).toBe('COMMENT');
    expect(body.body).toBe('LGTM');
  });
});
