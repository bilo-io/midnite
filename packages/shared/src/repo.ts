import { z } from 'zod';

// A repo is a named checkout the orchestrator runs agents against. The registry
// (DB-backed) is the runtime source of truth; `config.repos` seeds it on first
// boot (see RepoConfigSchema in config.ts). `task.repo` references a repo by its
// registry-unique **name**, which resolves to the checkout's filesystem path.

/** Max length of a repo's registry name (what `task.repo` references). */
export const MAX_REPO_NAME_LENGTH = 120;
/** Max length of a repo's filesystem path (stored in `~`-form). */
export const MAX_REPO_PATH_LENGTH = 1024;

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

export const RepoSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateRepoRequestSchema = z.object({
  name: RepoNameSchema,
  path: RepoPathSchema,
});

// Both fields optional, but a patch with neither is a no-op the caller almost
// certainly didn't mean — reject it rather than silently bumping `updatedAt`.
export const UpdateRepoRequestSchema = z
  .object({
    name: RepoNameSchema.optional(),
    path: RepoPathSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.path !== undefined, {
    message: 'at least one of name or path is required',
  });

export const RepoResponseSchema = z.object({ repo: RepoSchema });

export type Repo = z.infer<typeof RepoSchema>;
export type CreateRepoRequest = z.infer<typeof CreateRepoRequestSchema>;
export type UpdateRepoRequest = z.infer<typeof UpdateRepoRequestSchema>;
export type RepoResponse = z.infer<typeof RepoResponseSchema>;
