import { describe, expect, it, vi } from 'vitest';

import type { GithubProjectItem } from '@midnite/shared';

import { GithubNotConnectedError } from './github.service';
import {
  GithubProjectItemTakenError,
  GithubProjectScopeMissingError,
  GithubProjectsService,
} from './github-projects.service';
import type { GithubProjectItemsRepository } from './github-project-items.repository';
import type { GithubTokenService } from './github-token.service';

// A faked GraphQL transport keyed by operation name — the documents are real, so a query
// that stops selecting a field it needs shows up here rather than at runtime.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Route each request to a handler by the operation name in its document. */
function fakeGraphQl(handlers: Record<string, unknown>) {
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const query = String(JSON.parse(String(init?.body)).query);
    const op = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? '';
    const handler = handlers[op];
    if (handler === undefined) throw new Error(`unstubbed operation: ${op}`);
    return json(handler);
  }) as unknown as typeof fetch;
}

const tokens = (token: string | null): GithubTokenService =>
  ({
    resolve: vi.fn(async () => (token === null ? null : { token, source: 'oauth' as const })),
  }) as unknown as GithubTokenService;

function fakeRepo(initial: GithubProjectItem | null = null) {
  let current = initial;
  return {
    current: () => current,
    getByTask: vi.fn(() => current ?? undefined),
    findByNode: vi.fn(() => undefined),
    insert: vi.fn((w: Record<string, unknown>) => {
      current = { id: 'link-1', createdAt: 'now', updatedAt: 'now', ...w } as GithubProjectItem;
      return current;
    }),
    replaceMappings: vi.fn(),
    markSynced: vi.fn(),
    remove: vi.fn(() => {
      const had = current !== null;
      current = null;
      return had;
    }),
  } as unknown as GithubProjectItemsRepository & { current: () => GithubProjectItem | null };
}

const TASK = { id: 'task-1', title: 'Ship the thing', teamId: 'team-1', prompt: 'do it' };

const VIEWER_PROJECTS = {
  data: {
    viewer: {
      login: 'octo',
      projectsV2: { nodes: [{ id: 'PVT_mine', number: 1, title: 'Mine', url: 'u1', closed: false }] },
      organizations: {
        nodes: [
          {
            login: 'acme',
            projectsV2: {
              nodes: [{ id: 'PVT_org', number: 4, title: 'Roadmap', url: 'u2', closed: false }],
            },
          },
        ],
      },
    },
  },
};

const FIELDS = {
  data: {
    node: {
      id: 'PVT_org',
      fields: {
        nodes: [
          // A non-single-select field matches no inline fragment and arrives as `{}`.
          {},
          { id: 'PVTSSF_1', name: 'Status', options: [{ id: 'o1', name: 'Todo' }, { id: 'o2', name: 'Done' }] },
        ],
      },
    },
  },
};

const SUMMARY = { data: { node: { id: 'PVT_org', number: 4, title: 'Roadmap', url: 'u2', closed: false } } };
const ITEM_STATUS = {
  data: {
    node: {
      id: 'PVTI_1',
      project: { id: 'PVT_org', title: 'Roadmap', url: 'u2' },
      fieldValues: { nodes: [{ name: 'Todo', optionId: 'o1', field: { id: 'PVTSSF_1', name: 'Status' } }] },
      content: { url: 'https://github.com/acme/api/issues/9' },
    },
  },
};

const build = (handlers: Record<string, unknown>, repo = fakeRepo(), token: string | null = 'gho_x') =>
  ({
    service: new GithubProjectsService(tokens(token), repo, { fetchImpl: fakeGraphQl(handlers) }),
    repo,
  });

describe('listProjects', () => {
  it('returns the viewer\'s boards and their orgs\', each labelled with its owner', async () => {
    // Org boards need `read:org`; without it GitHub omits them rather than failing, which
    // is why every board carries the owner login the UI shows.
    const { service } = build({ ViewerProjects: VIEWER_PROJECTS });
    const projects = await service.listProjects('user-1');

    expect(projects).toEqual([
      { nodeId: 'PVT_mine', number: 1, title: 'Mine', ownerLogin: 'octo', url: 'u1', closed: false },
      { nodeId: 'PVT_org', number: 4, title: 'Roadmap', ownerLogin: 'acme', url: 'u2', closed: false },
    ]);
  });

  it('sorts closed boards last', async () => {
    const { service } = build({
      ViewerProjects: {
        data: {
          viewer: {
            login: 'octo',
            projectsV2: {
              nodes: [
                { id: 'a', number: 1, title: 'Closed', url: 'u', closed: true },
                { id: 'b', number: 2, title: 'Open', url: 'u', closed: false },
              ],
            },
            organizations: { nodes: [] },
          },
        },
      },
    });
    expect((await service.listProjects()).map((p) => p.title)).toEqual(['Open', 'Closed']);
  });

  it('survives an account with no boards at all', async () => {
    const { service } = build({
      ViewerProjects: { data: { viewer: { login: 'octo', projectsV2: null, organizations: null } } },
    });
    expect(await service.listProjects()).toEqual([]);
  });

  it('refuses when nothing is connected', async () => {
    const { service } = build({}, fakeRepo(), null);
    await expect(service.listProjects()).rejects.toBeInstanceOf(GithubNotConnectedError);
  });

  it('translates a missing `project` scope into its own error', async () => {
    // The remedy is "reconnect", not retry — GitHub's own wording sends people hunting.
    const { service } = build({
      ViewerProjects: { errors: [{ message: 'Resource not accessible', type: 'INSUFFICIENT_SCOPES' }] },
    });
    await expect(service.listProjects()).rejects.toBeInstanceOf(GithubProjectScopeMissingError);
  });
});

describe('listFields', () => {
  it('returns only single-select fields, dropping the empty inline nodes', async () => {
    const { service } = build({ ProjectFields: FIELDS });
    const fields = await service.listFields('PVT_org');
    expect(fields).toEqual([
      { nodeId: 'PVTSSF_1', name: 'Status', options: [{ id: 'o1', name: 'Todo' }, { id: 'o2', name: 'Done' }] },
    ]);
  });

  it('returns nothing for a board with no single-select field', async () => {
    const { service } = build({ ProjectFields: { data: { node: { id: 'x', fields: { nodes: [{}] } } } } });
    expect(await service.listFields('PVT_org')).toEqual([]);
  });
});

describe('link', () => {
  const HANDLERS = {
    ProjectSummary: SUMMARY,
    ProjectFields: FIELDS,
    AddDraftItem: { data: { addProjectV2DraftIssue: { projectItem: { id: 'PVTI_new' } } } },
    ItemStatus: ITEM_STATUS,
  };

  it('creates a draft item from the task by default', async () => {
    const { service, repo } = build(HANDLERS);
    const item = await service.link(TASK, { projectNodeId: 'PVT_org' }, 'user-1');

    expect(item.itemNodeId).toBe('PVTI_new');
    expect(item.projectTitle).toBe('Roadmap');
    expect(vi.mocked(repo.insert)).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'task-1', teamId: 'team-1', projectNodeId: 'PVT_org' }),
    );
  });

  it('adopts an existing item instead of creating one when given a node id', async () => {
    const { service } = build(HANDLERS);
    const item = await service.link(TASK, { projectNodeId: 'PVT_org', itemNodeId: 'PVTI_existing' }, 'u');
    expect(item.itemNodeId).toBe('PVTI_existing');
  });

  it('defaults the status mapping from the board\'s columns', async () => {
    const { service } = build(HANDLERS);
    const item = await service.link(TASK, { projectNodeId: 'PVT_org' }, 'u');
    expect(item.mappings).toEqual(
      expect.arrayContaining([
        { status: 'todo', optionId: 'o1', optionName: 'Todo' },
        { status: 'done', optionId: 'o2', optionName: 'Done' },
      ]),
    );
  });

  it('records the item\'s REAL column, not what midnite would push', async () => {
    // Read-back is display-only; the card must never imply midnite owns this value.
    const { service } = build(HANDLERS);
    const item = await service.link(TASK, { projectNodeId: 'PVT_org' }, 'u');
    expect(item.statusOptionName).toBe('Todo');
    expect(item.itemUrl).toBe('https://github.com/acme/api/issues/9');
  });

  it('links a board with no single-select field, simply with nothing to push to', async () => {
    const { service } = build({
      ...HANDLERS,
      ProjectFields: { data: { node: { id: 'x', fields: { nodes: [] } } } },
    });
    const item = await service.link(TASK, { projectNodeId: 'PVT_org' }, 'u');
    expect(item.mappings).toEqual([]);
    expect(item.statusFieldNodeId).toBeUndefined();
  });

  it('refuses to adopt an item another task already holds', async () => {
    const repo = fakeRepo();
    vi.mocked(repo.findByNode).mockReturnValue({ taskId: 'other-task' } as GithubProjectItem);
    const { service } = build(HANDLERS, repo);
    await expect(
      service.link(TASK, { projectNodeId: 'PVT_org', itemNodeId: 'PVTI_x' }, 'u'),
    ).rejects.toBeInstanceOf(GithubProjectItemTakenError);
  });

  it('replaces the task\'s own previous link rather than colliding', async () => {
    const repo = fakeRepo();
    vi.mocked(repo.findByNode).mockReturnValue({ taskId: 'task-1' } as GithubProjectItem);
    const { service } = build(HANDLERS, repo);
    await service.link(TASK, { projectNodeId: 'PVT_org', itemNodeId: 'PVTI_x' }, 'u');
    expect(vi.mocked(repo.remove)).toHaveBeenCalledWith('task-1');
  });

  it('still links when the read-back fails', async () => {
    // A failed read costs freshness, not the link — losing the link would be worse.
    const { service } = build({ ...HANDLERS, ItemStatus: { errors: [{ message: 'boom' }] } });
    const item = await service.link(TASK, { projectNodeId: 'PVT_org' }, 'u');
    expect(item.itemNodeId).toBe('PVTI_new');
    expect(item.statusOptionName).toBeUndefined();
  });
});

describe('refresh', () => {
  const LINKED = {
    id: 'link-1',
    taskId: 'task-1',
    itemNodeId: 'PVTI_1',
    statusFieldNodeId: 'PVTSSF_1',
  } as GithubProjectItem;

  it('records the observed column and clears any previous error', async () => {
    const repo = fakeRepo(LINKED);
    const { service } = build({ ItemStatus: ITEM_STATUS }, repo);
    await service.refresh('task-1', 'u');
    expect(vi.mocked(repo.markSynced)).toHaveBeenCalledWith('link-1', {
      statusOptionName: 'Todo',
      lastError: null,
    });
  });

  it('records lastError instead of throwing, so a stall is diagnosable', async () => {
    const repo = fakeRepo(LINKED);
    const { service } = build({ ItemStatus: { errors: [{ message: 'rate limited' }] } }, repo);
    await service.refresh('task-1', 'u');
    expect(vi.mocked(repo.markSynced)).toHaveBeenCalledWith(
      'link-1',
      expect.objectContaining({ lastError: expect.stringContaining('rate limited') }),
    );
  });
});
