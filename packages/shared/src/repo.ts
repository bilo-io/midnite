import { z } from 'zod';

// A repo is a named checkout the orchestrator runs agents against. The registry
// (DB-backed) is the runtime source of truth; `config.repos` seeds it on first
// boot (see RepoConfigSchema in config.ts). `task.repo` references a repo by its
// registry-unique **name**, which resolves to the checkout's filesystem path.

/** Max length of a repo's registry name (what `task.repo` references). */
export const MAX_REPO_NAME_LENGTH = 120;
/** Max length of a repo's filesystem path (stored in `~`-form). */
export const MAX_REPO_PATH_LENGTH = 1024;
/** Max length of a repo's branch prefix (e.g. `feature/`). */
export const MAX_REPO_BRANCH_PREFIX_LENGTH = 100;
/** Max length of a repo's PR-body template — capped so it stays a bounded slice
 *  of the agent prompt. */
export const MAX_REPO_PR_TEMPLATE_LENGTH = 4000;

const RepoNameSchema = z
  .string()
  .trim()
  .min(1, 'name is required')
  .max(MAX_REPO_NAME_LENGTH, `name must be ${MAX_REPO_NAME_LENGTH} characters or fewer`);

const RepoPathSchema = z
  .string()
  .trim()
  .min(1, 'path is required')
  .max(MAX_REPO_PATH_LENGTH, `path must be ${MAX_REPO_PATH_LENGTH} characters or fewer`);

// Conventions are optional and trimmed; an empty string clears the value (the
// service stores it as null). These feed the agent's seed prompt — see
// `appendRepoConventions` in the gateway — not a rule the gateway enforces.
const RepoBranchPrefixSchema = z
  .string()
  .trim()
  .max(
    MAX_REPO_BRANCH_PREFIX_LENGTH,
    `branch prefix must be ${MAX_REPO_BRANCH_PREFIX_LENGTH} characters or fewer`,
  );

const RepoPrTemplateSchema = z
  .string()
  .trim()
  .max(
    MAX_REPO_PR_TEMPLATE_LENGTH,
    `PR template must be ${MAX_REPO_PR_TEMPLATE_LENGTH} characters or fewer`,
  );

export const RepoSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  /** Branch-name prefix the agent should use for this repo's work (e.g. `feature/`). */
  branchPrefix: z.string().optional(),
  /** PR-body template the agent should follow when opening a pull request. */
  prTemplate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateRepoRequestSchema = z.object({
  name: RepoNameSchema,
  path: RepoPathSchema,
  branchPrefix: RepoBranchPrefixSchema.optional(),
  prTemplate: RepoPrTemplateSchema.optional(),
});

// All fields optional, but a patch with none is a no-op the caller almost
// certainly didn't mean — reject it rather than silently bumping `updatedAt`.
export const UpdateRepoRequestSchema = z
  .object({
    name: RepoNameSchema.optional(),
    path: RepoPathSchema.optional(),
    branchPrefix: RepoBranchPrefixSchema.optional(),
    prTemplate: RepoPrTemplateSchema.optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.path !== undefined ||
      v.branchPrefix !== undefined ||
      v.prTemplate !== undefined,
    { message: 'at least one field is required' },
  );

export const RepoResponseSchema = z.object({ repo: RepoSchema });

export type Repo = z.infer<typeof RepoSchema>;
export type CreateRepoRequest = z.infer<typeof CreateRepoRequestSchema>;
export type UpdateRepoRequest = z.infer<typeof UpdateRepoRequestSchema>;
export type RepoResponse = z.infer<typeof RepoResponseSchema>;
