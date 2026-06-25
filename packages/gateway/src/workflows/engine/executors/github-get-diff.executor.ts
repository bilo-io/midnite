import { Inject, Injectable } from '@nestjs/common';
import { GithubGetDiffParamsSchema } from '@midnite/shared';
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

/**
 * Fetch the unified diff for a GitHub pull request.
 * Truncates at maxTokens × 4 characters (1 token ≈ 4 chars) and
 * appends a notice so the AI model knows the diff is incomplete.
 */
@Injectable()
export class GithubGetDiffExecutor implements NodeExecutor {
  readonly typeId = 'github.get-diff';

  constructor(
    @Inject(WorkflowCredentialsService)
    private readonly credentials: WorkflowCredentialsService,
  ) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = GithubGetDiffParamsSchema.parse(ctx.params);

    const cred = await this.credentials.resolve(params.credentialId);
    if (!cred) {
      throw new Error(`credential ${params.credentialId} not found or could not be decrypted`);
    }
    if (cred.type !== 'github') {
      throw new Error(`expected a 'github' credential, got '${cred.type}'`);
    }

    const { apiBase, owner, repo, pullNumber } = parseGithubPrUrl(params.prUrl);
    const url = `${apiBase}/repos/${owner}/${repo}/pulls/${pullNumber}`;
    ctx.log('info', `fetching diff for ${owner}/${repo}#${pullNumber}`);

    const res = await fetch(url, {
      headers: {
        accept: 'application/vnd.github.v3.diff',
        authorization: `Bearer ${cred.token}`,
        'x-github-api-version': '2022-11-28',
      },
      signal: ctx.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub API error ${res.status}: ${text || res.statusText}`);
    }

    const rawDiff = await res.text();
    const maxChars = params.maxTokens * 4;
    const estimatedTokens = Math.ceil(rawDiff.length / 4);
    const truncated = rawDiff.length > maxChars;
    const diff = truncated
      ? rawDiff.slice(0, maxChars) +
        `\n\n[diff truncated — showing first ~${params.maxTokens} tokens of ~${estimatedTokens} estimated]`
      : rawDiff;

    if (truncated) {
      ctx.log(
        'warn',
        `diff truncated: ${rawDiff.length} chars → ${maxChars} (≈${estimatedTokens} tokens for ${owner}/${repo}#${pullNumber})`,
      );
    } else {
      ctx.log('info', `fetched diff (≈${estimatedTokens} tokens)`);
    }

    return { diff, truncated, estimatedTokens, prUrl: params.prUrl };
  }
}
