import type { Repo } from '@midnite/shared';

/** The repo fields that shape the agent's seed prompt (Phase 13 Theme E). */
type RepoConventions = Pick<Repo, 'branchPrefix' | 'prTemplate'>;

/**
 * Append a task's repo conventions — branch-naming prefix and PR-body template —
 * to its agent seed prompt. Pure + unit-tested; the runner calls it after URL
 * context enrichment.
 *
 * A repo with neither convention set (or no repo at all) leaves the prompt
 * untouched, so the section only appears when there's something to say. These are
 * *guidance* the agent follows, not a rule the gateway enforces.
 */
export function appendRepoConventions(prompt: string, repo: RepoConventions | undefined): string {
  if (!repo) return prompt;
  const branchPrefix = repo.branchPrefix?.trim();
  const prTemplate = repo.prTemplate?.trim();

  const parts: string[] = [];
  if (branchPrefix) {
    parts.push(
      `- **Branch naming:** create your work branch with the prefix \`${branchPrefix}\` ` +
        `(e.g. \`${branchPrefix}short-description\`).`,
    );
  }
  if (prTemplate) {
    parts.push(
      `- **Pull request body:** when you open the PR, follow this template:\n\n${prTemplate}`,
    );
  }
  if (parts.length === 0) return prompt;

  return `${prompt}\n\n---\n\n## Repository conventions\n\n${parts.join('\n\n')}\n`;
}
