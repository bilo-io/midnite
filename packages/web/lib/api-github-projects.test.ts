import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  getGithubProjects,
  linkTaskProjectItem,
  unlinkTaskProjectItem,
} from './api';

// The 204 case is the one worth pinning: `fetchJson` used to call `res.json()`
// unconditionally, so every `@HttpCode(204)` DELETE route **rejected on success** with a
// SyntaxError. The caller saw a parse error and never ran its success path — for the
// Projects v2 card that meant it kept rendering the link it had just deleted.

afterEach(() => vi.unstubAllGlobals());

/** A real `Response`, so the body/`.json()` semantics are the platform's, not a fake's. */
function stub(response: Response) {
  const fetchMock = vi.fn(async () => response) as unknown as typeof fetch;
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('unlinkTaskProjectItem', () => {
  it('resolves on a 204 with an empty body', async () => {
    // `new Response(null, { status: 204 }).json()` rejects with a SyntaxError — verified.
    stub(new Response(null, { status: 204 }));
    await expect(unlinkTaskProjectItem('task-1')).resolves.toBeUndefined();
  });

  it('still surfaces a real failure', async () => {
    stub(json({ message: 'not linked' }, 404));
    await expect(unlinkTaskProjectItem('task-1')).rejects.toBeInstanceOf(ApiError);
  });

  it('sends a DELETE to the task-scoped route', async () => {
    const fetchMock = stub(new Response(null, { status: 204 }));
    await unlinkTaskProjectItem('task 1/odd');
    const [url, init] = vi.mocked(fetchMock).mock.calls[0]!;
    // The id is encoded, so a slash in it can't forge a path segment.
    expect(String(url)).toContain('/tasks/task%201%2Fodd/github-project-item');
    expect((init as RequestInit).method).toBe('DELETE');
  });
});

describe('getGithubProjects', () => {
  it('parses the board list against the shared schema', async () => {
    stub(
      json({
        projects: [
          { nodeId: 'PVT_1', number: 4, title: 'Roadmap', ownerLogin: 'acme', url: 'u', closed: false },
        ],
      }),
    );
    await expect(getGithubProjects()).resolves.toEqual([
      { nodeId: 'PVT_1', number: 4, title: 'Roadmap', ownerLogin: 'acme', url: 'u', closed: false },
    ]);
  });

  it('carries the status so a caller can tell 409 from 403', async () => {
    // The card renders a different remedy for each: connect vs reconnect-for-scope.
    stub(json({ code: 'github_project_scope_missing', message: 'no project scope' }, 403));
    const err = await getGithubProjects().then(() => null, (e: unknown) => e as ApiError);
    expect(err?.status).toBe(403);
  });
});

describe('linkTaskProjectItem', () => {
  it('posts the board id and returns the parsed item', async () => {
    const item = {
      id: 'link-1',
      taskId: 'task-1',
      projectNodeId: 'PVT_1',
      itemNodeId: 'PVTI_1',
      projectTitle: 'Roadmap',
      projectUrl: 'u',
      itemUrl: 'u2',
      mappings: [],
      createdAt: 'a',
      updatedAt: 'b',
    };
    const fetchMock = stub(json({ item }));
    await expect(linkTaskProjectItem('task-1', { projectNodeId: 'PVT_1' })).resolves.toMatchObject({
      id: 'link-1',
    });
    expect(JSON.parse(String(vi.mocked(fetchMock).mock.calls[0]![1]?.body))).toEqual({
      projectNodeId: 'PVT_1',
    });
  });
});
