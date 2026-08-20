import { Inject, Injectable, Logger } from '@nestjs/common';

import type { GithubTokenSource } from '@midnite/shared';

import { WorkflowCredentialsService } from '../workflows/credentials/workflow-credentials.service';
import { GITHUB_EXEC_FILE } from './github.tokens';

const GH_TIMEOUT_MS = 5_000;

export type ResolvedGithubToken = {
  token: string;
  source: GithubTokenSource;
};

/** Narrowed `execFile` shape — injectable so the `gh` rung is testable without a binary. */
export type ExecFileFn = (
  file: string,
  args: string[],
  opts: { timeout: number },
) => Promise<{ stdout: string }>;

/**
 * The one place a GitHub token is resolved for the connected-GitHub surface
 * (Phase 84 Theme B).
 *
 * Resolution is a defined **ladder**, not a first match over an unordered list:
 *
 * 1. the acting user's own `github-oauth` credential — **Theme A** adds this rung
 * 2. the install-wide `github` PAT in the workflow credential vault
 * 3. the `gh` CLI's stored auth on the gateway host
 *
 * The ordering is the point. `pr-review.service.ts`'s `githubToken()` does
 * `list().find(c => c.type === 'github')`, which is fine while there is exactly one
 * GitHub credential and silently arbitrary the moment per-user rows exist — Theme A
 * repoints that call site here rather than growing a second ladder. Until then this
 * service is honest about being a shared-token fallback: `source` distinguishes a real
 * per-user connection from an install-wide PAT, so the UI never claims *your* GitHub
 * is connected when what it found was the operator's.
 *
 * `GithubModule` imports `WorkflowCredentialsModule`, so the vault is a required dep
 * rather than an `@Optional()` one — unit specs construct this class directly with a
 * fake, which is the reason the seams here are constructor params at all.
 */
@Injectable()
export class GithubTokenService {
  private readonly logger = new Logger(GithubTokenService.name);

  constructor(
    @Inject(WorkflowCredentialsService)
    private readonly credentials: WorkflowCredentialsService,
    // Named provider rather than a metadata-derived `@Optional()` param — see
    // `github.tokens.ts` for why that combination is banned in this codebase.
    @Inject(GITHUB_EXEC_FILE) private readonly execFileImpl: ExecFileFn,
  ) {}

  /**
   * Resolve a usable token, or `null` when the install has no GitHub access at all.
   *
   * `userId` is accepted (and currently only used for logging) so Theme A can add the
   * per-user rung without changing a single call site.
   */
  async resolve(userId?: string): Promise<ResolvedGithubToken | null> {
    const pat = await this.resolveVaultPat();
    if (pat) return { token: pat, source: 'pat' };

    const cli = await this.resolveGhCliToken();
    if (cli) return { token: cli, source: 'gh-cli' };

    this.logger.debug(`no GitHub token resolvable${userId ? ` for user ${userId}` : ''}`);
    return null;
  }

  /** The shared `github` PAT credential's token, if the vault holds one. */
  private async resolveVaultPat(): Promise<string | null> {
    const row = this.credentials.list().find((c) => c.type === 'github');
    if (!row) return null;
    const data = await this.credentials.resolve(row.id);
    return data?.type === 'github' ? data.token : null;
  }

  /**
   * `gh auth token` — the gateway host's own GitHub CLI auth.
   *
   * Fail-soft: a missing binary, a logged-out CLI and a timeout are all just "no token
   * from this rung", never an error the caller has to handle. This is the rung that
   * makes the repo browser work on a developer machine today, before Theme A exists.
   */
  private async resolveGhCliToken(): Promise<string | null> {
    try {
      const { stdout } = await this.execFileImpl('gh', ['auth', 'token'], {
        timeout: GH_TIMEOUT_MS,
      });
      const token = stdout.trim();
      return token.length > 0 ? token : null;
    } catch {
      return null;
    }
  }
}
