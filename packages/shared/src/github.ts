import { z } from 'zod';

import { RepoSchema } from './repo.js';
import { StatusSchema } from './task.js';

// Contracts for the **connected GitHub** surface (Phase 84 Theme B): browsing the
// signed-in user's real repositories and matching them against checkouts already on
// disk. The gateway proxies GitHub's REST API behind these shapes so `web` never
// talks to api.github.com and never sees a token.
//
// Theme A owns the per-user `github-oauth` credential that makes this authenticated
// as *you*; until it lands the gateway resolves whatever token the install already
// has (a shared `github` PAT, or the `gh` CLI) — see `GithubTokenSource`.

/** Machine-readable code on the 409 returned when no GitHub token can be resolved. */
export const GITHUB_NOT_CONNECTED_CODE = 'github_not_connected';

/**
 * Where the gateway's GitHub token came from. Reported on the connection so the UI
 * can say *how* you're connected — and so a shared-PAT install reads as connected
 * rather than as a personal connection it isn't.
 *
 * - `oauth` — the acting user's own `github-oauth` credential (Theme A)
 * - `pat` — the install-wide `github` PAT credential in the workflow vault
 * - `gh-cli` — the `gh` CLI's stored auth on the gateway host
 */
export const GITHUB_TOKEN_SOURCES = ['oauth', 'pat', 'gh-cli'] as const;
export const GithubTokenSourceSchema = z.enum(GITHUB_TOKEN_SOURCES);
export type GithubTokenSource = z.infer<typeof GithubTokenSourceSchema>;

/**
 * Whether a GitHub repo has a corresponding local checkout, and whether that
 * checkout is already in midnite's repo registry. Drives the three labels in the
 * repo browser: *already registered* · *on disk at …* · *not checked out*.
 */
export const GITHUB_CHECKOUT_STATES = ['registered', 'on-disk', 'not-checked-out'] as const;
export const GithubCheckoutStateSchema = z.enum(GITHUB_CHECKOUT_STATES);
export type GithubCheckoutState = z.infer<typeof GithubCheckoutStateSchema>;

/**
 * One of the user's GitHub repositories, annotated with how it relates to this
 * install. `localPath` is in `~`-form (like `repo.path`) so it stays portable;
 * `registeredRepoId` is set when a registry row already points at that checkout.
 */
export const GithubRepoSchema = z.object({
  /** GitHub's numeric repo id — stable across renames, so it's the list key. */
  id: z.number().int(),
  /** Bare repo name (`hello-world`), the default registry name on import. */
  name: z.string(),
  /** `owner/repo` slug — the join key for checkout matching. */
  ownerRepo: z.string(),
  owner: z.string(),
  private: z.boolean(),
  fork: z.boolean(),
  archived: z.boolean(),
  defaultBranch: z.string(),
  description: z.string().optional(),
  htmlUrl: z.string(),
  /** Last push (ISO-8601), when GitHub reports one — the list's default sort key. */
  pushedAt: z.string().optional(),
  /** `~`-form path of the matched local checkout, when one was found. */
  localPath: z.string().optional(),
  /** Registry row id, when this checkout is already a midnite repo. */
  registeredRepoId: z.string().optional(),
  checkoutState: GithubCheckoutStateSchema,
});
export type GithubRepo = z.infer<typeof GithubRepoSchema>;

export const GithubReposResponseSchema = z.object({
  items: z.array(GithubRepoSchema),
  /** When this list was fetched from GitHub (ISO-8601) — a cache hit reports the original fetch. */
  fetchedAt: z.string(),
  /** True when served from the gateway's short-TTL per-user cache. */
  cached: z.boolean(),
  /** Roots that were scanned for checkouts, `~`-form — surfaced so an empty match set is explicable. */
  scannedRoots: z.array(z.string()),
});
export type GithubReposResponse = z.infer<typeof GithubReposResponseSchema>;

/**
 * The install's GitHub connection state. `connected: false` carries no other
 * fields — nothing was resolvable, so there is nothing honest to report.
 */
export const GithubConnectionSchema = z.object({
  connected: z.boolean(),
  source: GithubTokenSourceSchema.optional(),
  login: z.string().optional(),
  avatarUrl: z.string().optional(),
  /** Scopes GitHub reports for the token (`x-oauth-scopes`); empty for a `gh` CLI token. */
  scopes: z.array(z.string()).default([]),
  connectedAt: z.string().optional(),
});
export type GithubConnection = z.infer<typeof GithubConnectionSchema>;

export const GithubConnectionResponseSchema = z.object({ connection: GithubConnectionSchema });
export type GithubConnectionResponse = z.infer<typeof GithubConnectionResponseSchema>;

/**
 * Import a browsed repo into the registry. `ownerRepo` is the only required field —
 * `name` defaults to the bare repo name and `path` to the matched checkout, which is
 * what makes importing an on-disk repo typing-free. An unmatched repo has no path to
 * infer, so the caller supplies one (the UI prefills the create form instead).
 */
export const ImportGithubRepoRequestSchema = z.object({
  ownerRepo: z.string().regex(/^[^/]+\/[^/]+$/, 'must be in "owner/repo" format'),
  name: z.string().trim().min(1).optional(),
  path: z.string().trim().min(1).optional(),
});
export type ImportGithubRepoRequest = z.infer<typeof ImportGithubRepoRequestSchema>;

export const ImportGithubRepoResponseSchema = z.object({ repo: RepoSchema });
export type ImportGithubRepoResponse = z.infer<typeof ImportGithubRepoResponseSchema>;

// --- GitHub Projects v2 (Phase 84 Theme E) ---
//
// Projects v2 is GraphQL-only, and its ids are opaque **node ids** rather than numbers —
// so everything below keys on `nodeId`, never on a slug or a number that looks stable.

/** A Projects v2 board the connected account can see. */
export const GithubProjectSchema = z.object({
  /** Opaque GraphQL node id — the only stable handle Projects v2 offers. */
  nodeId: z.string(),
  /** Board number within its owner, for display (`#4`) and URL building. */
  number: z.number().int(),
  title: z.string(),
  /** Login of the user or org that owns the board. */
  ownerLogin: z.string(),
  url: z.string(),
  closed: z.boolean(),
});
export type GithubProject = z.infer<typeof GithubProjectSchema>;

export const GithubProjectsResponseSchema = z.object({ projects: z.array(GithubProjectSchema) });
export type GithubProjectsResponse = z.infer<typeof GithubProjectsResponseSchema>;

/** One option of a single-select field — a column, in board terms. */
export const GithubProjectFieldOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type GithubProjectFieldOption = z.infer<typeof GithubProjectFieldOptionSchema>;

/**
 * A single-select field on a board. Only single-selects are returned: they're the only
 * field type a midnite status can map onto, and offering text or date fields would just
 * be a way to configure something that can never work.
 */
export const GithubProjectFieldSchema = z.object({
  nodeId: z.string(),
  name: z.string(),
  options: z.array(GithubProjectFieldOptionSchema),
});
export type GithubProjectField = z.infer<typeof GithubProjectFieldSchema>;

export const GithubProjectFieldsResponseSchema = z.object({
  fields: z.array(GithubProjectFieldSchema),
});
export type GithubProjectFieldsResponse = z.infer<typeof GithubProjectFieldsResponseSchema>;

/**
 * How a midnite status maps to a column on the linked board.
 *
 * Stored per link and per status (normalised rows, not a blob), defaulted by fuzzy name
 * match at link time and editable afterwards. A status with **no** entry is a deliberate
 * no-op on push, not an error — plenty of boards have no "Waiting" column, and failing
 * would make a normal setup look broken.
 */
export const GithubProjectStatusMappingSchema = z.object({
  status: StatusSchema,
  /** Option id on the linked board's single-select field. */
  optionId: z.string(),
  /** Option name at mapping time, so the UI can render without a discovery round-trip. */
  optionName: z.string(),
});
export type GithubProjectStatusMapping = z.infer<typeof GithubProjectStatusMappingSchema>;

/** A task's link to a Projects v2 item, plus the last state read back from GitHub. */
export const GithubProjectItemSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  projectNodeId: z.string(),
  itemNodeId: z.string(),
  projectTitle: z.string(),
  projectUrl: z.string(),
  /** Single-select field the status maps onto; absent when the board has none. */
  statusFieldNodeId: z.string().optional(),
  /**
   * The item's **real column on GitHub** as of the last read — not what midnite pushed.
   * Theme F's poller refreshes it; until then it's the value read at link time.
   */
  statusOptionName: z.string().optional(),
  itemUrl: z.string(),
  lastSyncedAt: z.string().optional(),
  /** Last push/read failure, surfaced on the card rather than swallowed. */
  lastError: z.string().optional(),
  mappings: z.array(GithubProjectStatusMappingSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GithubProjectItem = z.infer<typeof GithubProjectItemSchema>;

export const GithubProjectItemResponseSchema = z.object({ item: GithubProjectItemSchema });
export type GithubProjectItemResponse = z.infer<typeof GithubProjectItemResponseSchema>;

/**
 * Link a task to a board. Either **create a draft item** from the task (the default —
 * the task already exists here, so making the item by hand on GitHub is a detour), or
 * adopt an existing item by its node id.
 */
export const LinkGithubProjectItemRequestSchema = z
  .object({
    projectNodeId: z.string().min(1),
    /** Adopt this existing item instead of creating a draft one. */
    itemNodeId: z.string().min(1).optional(),
    /** Single-select field to drive; defaults to the board's first, when it has one. */
    statusFieldNodeId: z.string().min(1).optional(),
  })
  .strict();
export type LinkGithubProjectItemRequest = z.infer<typeof LinkGithubProjectItemRequestSchema>;

/** Replace a link's status→column mapping. An empty array clears it (every push a no-op). */
export const UpdateGithubProjectMappingRequestSchema = z.object({
  mappings: z.array(GithubProjectStatusMappingSchema),
});
export type UpdateGithubProjectMappingRequest = z.infer<
  typeof UpdateGithubProjectMappingRequestSchema
>;

/** The resolved token lacks the `project` scope — the caller should reconnect, not retry. */
export const GITHUB_PROJECT_SCOPE_MISSING_CODE = 'github_project_scope_missing';
