import { Inject, Injectable } from '@nestjs/common';
import { GithubPostReviewParamsSchema } from '@midnite/shared';
import { WorkflowCredentialsService } from '../../credentials/workflow-credentials.service';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

function parseGithubPrUrl(prUrl: string): { apiBase: string; owner: string; repo: string; pullNumber: number } {
  const match = /^(https?:\/\/[^/]+)\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(prUrl);
  if (!match) throw new Error(`cannot parse GitHub PR URL: ${prUrl}`);
  const [, origin, owner, repo, num] = match;
  const host = new URL(origin as string).hostname;
  const apiBase = host === 'github.com' ? 'https://api.github.com' : `${origin}/api/v3`;
  return { apiBase: apiBase as string, owner: owner as string, repo: repo as string, pullNumber: Number(num) };
}

/** Submit a review (comment, approval, or request-changes) on a GitHub pull request. */
@Injectable()
export class GithubPostReviewExecutor implements NodeExecutor {
  readonly typeId = 'github.post-review';

  constructor(
    @Inject(WorkflowCredentialsService)
    private readonly credentials: WorkflowCredentialsService,
  ) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = GithubPostReviewParamsSchema.parse(ctx.params);

    const cred = await this.credentials.resolve(params.credentialId);
    if (!cred) {
      throw new Error(`credential ${params.credentialId} not found or could not be decrypted`);
    }
    if (cred.type !== 'github') {
      throw new Error(`expected a 'github' credential, got '${cred.type}'`);
    }

    const { apiBase, owner, repo, pullNumber } = parseGithubPrUrl(params.prUrl);
    const url = `${apiBase}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;
    ctx.log('info', `posting review (${params.event}) on ${owner}/${repo}#${pullNumber}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${cred.token}`,
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ body: params.body, event: params.event }),
      signal: ctx.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub API error ${res.status}: ${text || res.statusText}`);
    }

    const review = (await res.json()) as { id: number; html_url: string; state: string };
    ctx.log('info', `review posted: ${review.html_url}`);
    return { reviewId: review.id, htmlUrl: review.html_url, state: review.state };
  }
}
