import { Inject, Injectable, Logger } from '@nestjs/common';

import type {
  GithubProject,
  GithubProjectField,
  GithubProjectItem,
  GithubProjectStatusMapping,
  LinkGithubProjectItemRequest,
  Task,
} from '@midnite/shared';

import { GithubProjectItemsRepository } from './github-project-items.repository';
import { GithubTokenService } from './github-token.service';
import { GITHUB_FETCH_OPTIONS } from './github.tokens';
import { GithubNotConnectedError } from './github.service';
import { githubGraphQl, isMissingScopeError } from './lib/github-graphql';
import type { GithubFetchOptions } from './lib/github-rest';
import {
  ADD_DRAFT_ITEM_MUTATION,
  ITEM_STATUS_QUERY,
  PROJECT_FIELDS_QUERY,
  PROJECT_SUMMARY_QUERY,
  VIEWER_PROJECTS_QUERY,
  type AddDraftItemResponse,
  type ItemStatusResponse,
  type ProjectFieldsResponse,
  type ProjectSummaryResponse,
  type ViewerProjectsResponse,
} from './lib/github-projects-queries';
import { defaultStatusMappings } from './lib/status-mapping';

/**
 * The resolved token can't reach Projects v2 for want of the `project` scope.
 *
 * Its own error because the remedy is specific and unusual: **reconnect**, not retry and
 * not "ask an admin". A token minted before Theme A's connect flow — a shared PAT, or the
 * host's `gh` CLI auth — very plausibly lacks it, and GitHub's own wording ("Resource not
 * accessible by personal access token") sends people looking in the wrong place.
 */
export class GithubProjectScopeMissingError extends Error {
  constructor() {
    super(
      'the GitHub token in use cannot access Projects v2 — reconnect your GitHub account to grant the "project" scope',
    );
    this.name = 'GithubProjectScopeMissingError';
  }
}

/** The task has no Projects v2 link (or the caller can't see it). */
export class GithubProjectItemDoesNotExistError extends Error {
  constructor(taskId: string) {
    super(`task ${taskId} is not linked to a GitHub Project item`);
    this.name = 'GithubProjectItemDoesNotExistError';
  }
}

/** Another task already adopted this GitHub item. */
export class GithubProjectItemTakenError extends Error {
  constructor(readonly taskId: string) {
    super(`that GitHub Project item is already linked to task ${taskId}`);
    this.name = 'GithubProjectItemTakenError';
  }
}

/** Boards asked for per page — far more than anyone has, and one round-trip. */
const PROJECT_PAGE_SIZE = 50;
/** Fields/field-values asked for per board. Boards rarely exceed a handful. */
const FIELD_PAGE_SIZE = 50;

@Injectable()
export class GithubProjectsService {
  private readonly logger = new Logger(GithubProjectsService.name);

  constructor(
    @Inject(GithubTokenService) private readonly tokens: GithubTokenService,
    @Inject(GithubProjectItemsRepository) private readonly repo: GithubProjectItemsRepository,
    @Inject(GITHUB_FETCH_OPTIONS) private readonly fetchOptions: GithubFetchOptions,
  ) {}

  /** Boards the connected account can see — theirs plus their orgs'. */
  async listProjects(userId?: string): Promise<GithubProject[]> {
    const token = await this.requireToken(userId);
    const { data } = await this.query<ViewerProjectsResponse>(
      VIEWER_PROJECTS_QUERY,
      { first: PROJECT_PAGE_SIZE },
      token,
    );

    const viewer = data.viewer;
    if (!viewer) return [];
    const projects: GithubProject[] = [];
    for (const node of viewer.projectsV2?.nodes ?? []) {
      if (node) projects.push(toProject(node, viewer.login));
    }
    // Org boards need `read:org`. Without it GitHub returns the personal ones and omits
    // these rather than failing — which is why every board carries its owner login.
    for (const org of viewer.organizations?.nodes ?? []) {
      if (!org) continue;
      for (const node of org.projectsV2?.nodes ?? []) {
        if (node) projects.push(toProject(node, org.login));
      }
    }
    // Closed boards last, then most-recently-updated first (GitHub's own ordering).
    return projects.sort((a, b) => Number(a.closed) - Number(b.closed));
  }

  /** A board's single-select fields — the only ones a status can map onto. */
  async listFields(projectNodeId: string, userId?: string): Promise<GithubProjectField[]> {
    const token = await this.requireToken(userId);
    const { data } = await this.query<ProjectFieldsResponse>(
      PROJECT_FIELDS_QUERY,
      { projectId: projectNodeId, first: FIELD_PAGE_SIZE },
      token,
    );
    return readFields(data);
  }

  /** The task's link, mapping included, or undefined. */
  get(taskId: string): GithubProjectItem | undefined {
    return this.repo.getByTask(taskId);
  }

  /**
   * Link `task` to a board — creating a draft item from it by default, or adopting an
   * existing item when `itemNodeId` is given.
   *
   * The status mapping is defaulted by fuzzy name match here and is immediately editable;
   * a board with no single-select field links fine and simply has nothing to push to.
   */
  async link(
    task: Pick<Task, 'id' | 'title' | 'teamId'> & { prompt?: string },
    req: LinkGithubProjectItemRequest,
    userId?: string,
  ): Promise<GithubProjectItem> {
    const token = await this.requireToken(userId);

    const summary = await this.query<ProjectSummaryResponse>(
      PROJECT_SUMMARY_QUERY,
      { projectId: req.projectNodeId },
      token,
    );
    const project = summary.data.node;
    if (!project) throw new GithubProjectItemDoesNotExistError(task.id);

    const itemNodeId = req.itemNodeId ?? (await this.createDraftItem(req.projectNodeId, task, token));

    // Refuse before writing: two tasks pointing at one item makes both cards lie about
    // which one owns the column.
    const taken = this.repo.findByNode(req.projectNodeId, itemNodeId);
    if (taken && taken.taskId !== task.id) throw new GithubProjectItemTakenError(taken.taskId);

    const fields = readFields(
      (
        await this.query<ProjectFieldsResponse>(
          PROJECT_FIELDS_QUERY,
          { projectId: req.projectNodeId, first: FIELD_PAGE_SIZE },
          token,
        )
      ).data,
    );
    const field = req.statusFieldNodeId
      ? fields.find((f) => f.nodeId === req.statusFieldNodeId)
      : fields[0];
    const mappings: GithubProjectStatusMapping[] = field ? defaultStatusMappings(field.options) : [];

    // Read the item's *real* column now, so the card is honest from the first render
    // rather than showing whatever midnite would have pushed.
    const observed = await this.readItemStatus(itemNodeId, token, field?.nodeId).catch(() => undefined);

    // Re-linking the same task replaces its link rather than colliding on the unique index.
    this.repo.remove(task.id);
    return this.repo.insert({
      taskId: task.id,
      teamId: task.teamId,
      projectNodeId: req.projectNodeId,
      itemNodeId,
      projectTitle: project.title,
      projectUrl: project.url,
      statusFieldNodeId: field?.nodeId,
      statusOptionName: observed?.optionName,
      itemUrl: observed?.itemUrl ?? project.url,
      mappings,
    });
  }

  /** Unlink. The GitHub item is deliberately left alone (Decision §9). */
  unlink(taskId: string): void {
    if (!this.repo.remove(taskId)) throw new GithubProjectItemDoesNotExistError(taskId);
  }

  /** Replace the status→column mapping. An empty array clears it. */
  updateMappings(taskId: string, mappings: readonly GithubProjectStatusMapping[]): GithubProjectItem {
    const existing = this.repo.getByTask(taskId);
    if (!existing) throw new GithubProjectItemDoesNotExistError(taskId);
    this.repo.replaceMappings(existing.id, mappings);
    return this.repo.getByTask(taskId)!;
  }

  /**
   * Refresh one link's column from GitHub. **Display-only** (§5) — it never moves the
   * midnite task, so the UI can't lie about which direction sync runs.
   */
  async refresh(taskId: string, userId?: string): Promise<GithubProjectItem> {
    const existing = this.repo.getByTask(taskId);
    if (!existing) throw new GithubProjectItemDoesNotExistError(taskId);
    const token = await this.requireToken(userId);
    try {
      const observed = await this.readItemStatus(existing.itemNodeId, token, existing.statusFieldNodeId);
      this.repo.markSynced(existing.id, {
        statusOptionName: observed?.optionName ?? null,
        lastError: null,
      });
    } catch (err) {
      // Surfaced on the card, not swallowed — a silent stall is the failure mode §F warns
      // about. The link survives; only the freshness is in doubt.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Projects v2 read-back failed for task ${taskId}: ${message}`);
      this.repo.markSynced(existing.id, { lastError: message });
    }
    return this.repo.getByTask(taskId)!;
  }

  private async createDraftItem(
    projectNodeId: string,
    task: Pick<Task, 'id' | 'title'> & { prompt?: string },
    token: string,
  ): Promise<string> {
    const { data } = await this.query<AddDraftItemResponse>(
      ADD_DRAFT_ITEM_MUTATION,
      {
        projectId: projectNodeId,
        title: task.title,
        // GitHub rejects a null body; an empty string is the documented "no body".
        body: task.prompt ?? '',
      },
      token,
    );
    const id = data.addProjectV2DraftIssue?.projectItem?.id;
    if (!id) throw new GithubProjectItemDoesNotExistError(task.id);
    return id;
  }

  /** The item's current single-select value + its URL, as GitHub reports them. */
  private async readItemStatus(
    itemNodeId: string,
    token: string,
    fieldNodeId?: string,
  ): Promise<{ optionName?: string; itemUrl?: string } | undefined> {
    const { data } = await this.query<ItemStatusResponse>(
      ITEM_STATUS_QUERY,
      { itemId: itemNodeId, first: FIELD_PAGE_SIZE },
      token,
    );
    const node = data.node;
    if (!node) return undefined;
    const values = (node.fieldValues?.nodes ?? []).filter(Boolean);
    // Prefer the field the link drives; fall back to the first single-select present, so a
    // board whose field was renamed still shows *something* real.
    const match =
      values.find((v) => fieldNodeId && v?.field?.id === fieldNodeId) ??
      values.find((v) => typeof v?.name === 'string');
    return { optionName: match?.name, itemUrl: node.content?.url };
  }

  /** One place the ladder is consulted. */
  private async requireToken(userId?: string): Promise<string> {
    const resolved = await this.tokens.resolve(userId);
    if (!resolved) throw new GithubNotConnectedError();
    return resolved.token;
  }

  /**
   * One place a missing scope is translated.
   *
   * The token is a **parameter, not a field**: stashing the in-flight token on `this`
   * would let two concurrent requests swap tokens across an `await` and run one user's
   * query with another's credentials.
   */
  private async query<T>(document: string, variables: Record<string, unknown>, token: string) {
    try {
      return await githubGraphQl<T>(document, variables, token, this.fetchOptions);
    } catch (err) {
      if (isMissingScopeError(err)) throw new GithubProjectScopeMissingError();
      throw err;
    }
  }
}

function toProject(node: { id: string; number: number; title: string; url: string; closed: boolean }, ownerLogin: string): GithubProject {
  return {
    nodeId: node.id,
    number: node.number,
    title: node.title,
    ownerLogin,
    url: node.url,
    closed: node.closed,
  };
}

/** Single-select fields only — the query already filters, this drops the empty inline nodes. */
function readFields(data: ProjectFieldsResponse): GithubProjectField[] {
  const fields: GithubProjectField[] = [];
  for (const node of data.node?.fields?.nodes ?? []) {
    // A non-single-select field matches no inline fragment and comes back as `{}`.
    if (!node?.id || !node.name || !Array.isArray(node.options)) continue;
    fields.push({ nodeId: node.id, name: node.name, options: node.options });
  }
  return fields;
}
