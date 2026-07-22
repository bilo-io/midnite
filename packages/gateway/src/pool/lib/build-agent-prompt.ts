import type { Repo } from '@midnite/shared';

/** The repo fields that shape the agent's seed prompt (Phase 13 Theme E). */
type RepoConventions = Pick<Repo, 'branchPrefix' | 'prTemplate'>;

/**
 * Fold a task's optional free-form description into its seed prompt, right after
 * the title/prompt line and before any URL/knowledge/repo context. An empty or
 * missing description leaves the prompt untouched, so the section only appears
 * when the user actually wrote one. Pure + unit-tested.
 */
export function appendDescription(prompt: string, description: string | undefined | null): string {
  const detail = description?.trim();
  if (!detail) return prompt;
  return `${prompt}\n\n## Description\n\n${detail}`;
}

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
