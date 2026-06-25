import { Inject, Injectable } from '@nestjs/common';
import { GithubGetPrParamsSchema } from '@midnite/shared';
import { WorkflowCredentialsService } from '../../credentials/workflow-credentials.service';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

function parseGithubPrUrl(prUrl: string): { apiBase: string; owner: string; repo: string; pullNumber: number } {
  // Accepts: https://github.com/owner/repo/pull/42
  // or GHE:  https://github.example.com/owner/repo/pull/42
  const match = /^(https?:\/\/[^/]+)\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(prUrl);
  if (!match) throw new Error(`cannot parse GitHub PR URL: ${prUrl}`);
  const [, origin, owner, repo, num] = match;
  const host = new URL(origin as string).hostname;
  const apiBase = host === 'github.com' ? 'https://api.github.com' : `${origin}/api/v3`;
  return { apiBase: apiBase as string, owner: owner as string, repo: repo as string, pullNumber: Number(num) };
}

/** Fetch pull-request metadata (title, state, author, labels, etc.) from GitHub. */
@Injectable()
export class GithubGetPrExecutor implements NodeExecutor {
  readonly typeId = 'github.get-pr';

  constructor(
    @Inject(WorkflowCredentialsService)
    private readonly credentials: WorkflowCredentialsService,
  ) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = GithubGetPrParamsSchema.parse(ctx.params);

    const cred = await this.credentials.resolve(params.credentialId);
    if (!cred) {
      throw new Error(`credential ${params.credentialId} not found or could not be decrypted`);
    }
    if (cred.type !== 'github') {
      throw new Error(`expected a 'github' credential, got '${cred.type}'`);
    }

    const { apiBase, owner, repo, pullNumber } = parseGithubPrUrl(params.prUrl);
    const url = `${apiBase}/repos/${owner}/${repo}/pulls/${pullNumber}`;
    ctx.log('info', `fetching PR ${owner}/${repo}#${pullNumber}`);

    const res = await fetch(url, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${cred.token}`,
        'x-github-api-version': '2022-11-28',
      },
      signal: ctx.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub API error ${res.status}: ${text || res.statusText}`);
    }

    const pr = (await res.json()) as {
      number: number;
      title: string;
      body: string | null;
      state: string;
      html_url: string;
      user: { login: string } | null;
      labels: { name: string }[];
      head: { ref: string; sha: string };
      base: { ref: string };
      additions: number;
      deletions: number;
      changed_files: number;
    };

    ctx.log('info', `fetched PR "${pr.title}" (${pr.state})`);
    return {
      number: pr.number,
      title: pr.title,
      body: pr.body ?? '',
      state: pr.state,
      htmlUrl: pr.html_url,
      author: pr.user?.login ?? '',
      labels: pr.labels.map((l) => l.name),
      headBranch: pr.head.ref,
      headSha: pr.head.sha,
      baseBranch: pr.base.ref,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
    };
  }
}
