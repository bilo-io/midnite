import { Inject, Injectable } from '@nestjs/common';
import { GithubGetDiffParamsSchema } from '@midnite/shared';
import { WorkflowCredentialsService } from '../../credentials/workflow-credentials.service';
import { fetchGithubPrDiff } from '../../../tasks/lib/github-diff';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/**
 * Fetch the unified diff for a GitHub pull request.
 * Truncates at maxTokens × 4 characters (1 token ≈ 4 chars) and
 * appends a notice so the AI model knows the diff is incomplete.
 *
 * The raw fetch is delegated to the shared `fetchGithubPrDiff` (also backing the
 * task-scoped `PrDiffService`); this executor supplies the workflow credential as
 * the Bearer token so the authenticated REST path stays primary — behaviour-
 * preserving for the `github.get-diff` node.
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

    ctx.log('info', `fetching diff for ${params.prUrl}`);
    const rawDiff = await fetchGithubPrDiff(params.prUrl, {
      token: cred.token,
      signal: ctx.signal,
    });
    if (rawDiff === null) {
      throw new Error(`could not fetch diff for ${params.prUrl}`);
    }

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
        `diff truncated: ${rawDiff.length} chars → ${maxChars} (≈${estimatedTokens} tokens for ${params.prUrl})`,
      );
    } else {
      ctx.log('info', `fetched diff (≈${estimatedTokens} tokens)`);
    }

    return { diff, truncated, estimatedTokens, prUrl: params.prUrl };
  }
}
