import { describe, expect, it, vi } from 'vitest';
import type { PrReviewSubmission } from '@midnite/shared';
import { mergeGithubPr, submitGithubReview } from './github-review';

const PR = 'https://github.com/acme/api/pull/42';

describe('submitGithubReview', () => {
  it('POSTs the review via `gh api` with the mapped event + inline comments', async () => {
    const runGh = vi.fn(async (_args: string[], _input?: string) =>
      JSON.stringify({ html_url: 'https://github.com/acme/api/pull/42#r1', state: 'CHANGES_REQUESTED' }),
    );
    const submission: PrReviewSubmission = {
      event: 'request-changes',
      body: 'needs work',
      comments: [{ path: 'src/a.ts', line: 10, side: 'RIGHT', body: 'nit' }],
    };

    const result = await submitGithubReview(PR, submission, { runGh });

    expect(runGh).toHaveBeenCalledTimes(1);
    const [args, input] = runGh.mock.calls[0]!;
    expect(args).toEqual(['api', '--method', 'POST', 'repos/acme/api/pulls/42/reviews', '--input', '-']);
    const body = JSON.parse(input as string);
    expect(body).toMatchObject({
      event: 'REQUEST_CHANGES',
      body: 'needs work',
      comments: [{ path: 'src/a.ts', line: 10, side: 'RIGHT', body: 'nit' }],
    });
    expect(result.state).toBe('CHANGES_REQUESTED');
  });

  it('omits body/comments when absent (bare approve)', async () => {
    const runGh = vi.fn(async (_args: string[], _input?: string) => '{}');
    await submitGithubReview(PR, { event: 'approve', comments: [] }, { runGh });
    const body = JSON.parse(runGh.mock.calls[0]![1] as string);
    expect(body).toEqual({ event: 'APPROVE' });
  });

  it('falls back to REST with a token when gh fails', async () => {
    const runGh = vi.fn(async (_args: string[], _input?: string) => {
      throw new Error('gh: not found');
    });
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({ html_url: 'u', state: 'APPROVED' }), { status: 200 }),
    );
    const result = await submitGithubReview(
      PR,
      { event: 'approve', comments: [] },
      { runGh, getToken: async () => 'tok', fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.github.com/repos/acme/api/pulls/42/reviews');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(result.state).toBe('APPROVED');
  });

  it('rethrows the gh error when no token is available', async () => {
    const runGh = vi.fn(async () => {
      throw new Error('gh boom');
    });
    await expect(submitGithubReview(PR, { event: 'approve', comments: [] }, { runGh })).rejects.toThrow('gh boom');
  });
});

describe('mergeGithubPr', () => {
  it('shells `gh pr merge` with the method flag', async () => {
    const runGh = vi.fn(async () => '');
    await mergeGithubPr(PR, 'squash', { runGh });
    expect(runGh).toHaveBeenCalledWith(['pr', 'merge', PR, '--squash']);
  });

  it('surfaces a gh refusal (branch protection) when no token', async () => {
    const runGh = vi.fn(async () => {
      throw new Error('Pull request is not mergeable');
    });
    await expect(mergeGithubPr(PR, 'merge', { runGh })).rejects.toThrow('not mergeable');
  });

  it('falls back to the REST merge endpoint with a token', async () => {
    const runGh = vi.fn(async (_args: string[], _input?: string) => {
      throw new Error('gh missing');
    });
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}', { status: 200 }));
    await mergeGithubPr(PR, 'rebase', { runGh, getToken: async () => 'tok', fetchImpl: fetchImpl as unknown as typeof fetch });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.github.com/repos/acme/api/pulls/42/merge');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ merge_method: 'rebase' });
  });
});
