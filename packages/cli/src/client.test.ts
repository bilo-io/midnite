import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient, parseStatus, resolveBaseUrl } from './client.js';

const TASK = {
  id: 't1',
  title: 'do the thing',
  status: 'todo',
  events: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env['MIDNITE_GATEWAY_URL'];
});

function stubFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

describe('resolveBaseUrl', () => {
  it('prefers the flag, then env, then the loopback default', () => {
    expect(resolveBaseUrl('http://host:1/')).toBe('http://host:1');
    process.env['MIDNITE_GATEWAY_URL'] = 'http://env:2';
    expect(resolveBaseUrl()).toBe('http://env:2');
    delete process.env['MIDNITE_GATEWAY_URL'];
    expect(resolveBaseUrl()).toBe('http://localhost:7777');
  });
});

describe('parseStatus', () => {
  it('accepts a valid status and rejects an invalid one', () => {
    expect(parseStatus('wip')).toBe('wip');
    expect(() => parseStatus('nope')).toThrow(/invalid status/);
  });
});

describe('createClient', () => {
  it('listTasks builds the status query and validates the response', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(JSON.stringify([TASK]), { status: 200 });
    });
    const tasks = await createClient('http://gw').listTasks('todo');
    expect(seenUrl).toBe('http://gw/tasks?status=todo');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.id).toBe('t1');
  });

  it('createTask posts multipart and unwraps { task }', async () => {
    let method = '';
    stubFetch((_url, init) => {
      method = init?.method ?? '';
      return new Response(JSON.stringify({ task: TASK }), { status: 200 });
    });
    const task = await createClient('http://gw').createTask('do the thing');
    expect(method).toBe('POST');
    expect(task.title).toBe('do the thing');
  });

  it('createTask threads repo/priority/projectId into the form', async () => {
    let form: FormData | undefined;
    stubFetch((_url, init) => {
      form = init?.body as FormData;
      return new Response(JSON.stringify({ task: TASK }), { status: 200 });
    });
    await createClient('http://gw').createTask('do the thing', { repo: 'acme/app', priority: 2, projectId: 'p1' });
    expect(form?.get('prompt')).toBe('do the thing');
    expect(form?.get('repo')).toBe('acme/app');
    expect(form?.get('priority')).toBe('2');
    expect(form?.get('projectId')).toBe('p1');
  });

  it('createTask appends each --depends-on id as a repeatable form field', async () => {
    let form: FormData | undefined;
    stubFetch((_url, init) => {
      form = init?.body as FormData;
      return new Response(JSON.stringify({ task: { ...TASK, dependsOn: ['a', 'b'] } }), { status: 200 });
    });
    const task = await createClient('http://gw').createTask('do the thing', { dependsOn: ['a', 'b'] });
    expect(form?.getAll('dependsOn')).toEqual(['a', 'b']);
    expect(task.dependsOn).toEqual(['a', 'b']);
  });

  it('addDependency POSTs the dependencies endpoint with the blocker id', async () => {
    let seenUrl = '';
    let body: unknown;
    stubFetch((url, init) => {
      seenUrl = url;
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ...TASK, dependsOn: ['blk'] }), { status: 200 });
    });
    const task = await createClient('http://gw').addDependency('t1', 'blk');
    expect(seenUrl).toBe('http://gw/tasks/t1/dependencies');
    expect(body).toEqual({ dependsOnId: 'blk' });
    expect(task.dependsOn).toEqual(['blk']);
  });

  it('removeDependency DELETEs the scoped dependency edge', async () => {
    let seenUrl = '';
    let method = '';
    stubFetch((url, init) => {
      seenUrl = url;
      method = init?.method ?? '';
      return new Response(JSON.stringify({ ...TASK, dependsOn: [] }), { status: 200 });
    });
    const task = await createClient('http://gw').removeDependency('t1', 'blk');
    expect(seenUrl).toBe('http://gw/tasks/t1/dependencies/blk');
    expect(method).toBe('DELETE');
    expect(task.dependsOn).toEqual([]);
  });

  it('surfaces a cycle rejection (409) message from addDependency', async () => {
    stubFetch(() => new Response(JSON.stringify({ message: 'depending on t2 would create a dependency cycle' }), { status: 409 }));
    await expect(createClient('http://gw').addDependency('t1', 't2')).rejects.toThrow(/dependency cycle/);
  });

  it('createBulk posts JSON to /tasks/bulk and validates the response', async () => {
    let seenUrl = '';
    let body: unknown;
    stubFetch((url, init) => {
      seenUrl = url;
      body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          results: [{ line: 'a', taskId: 't1', kind: 'bug', status: 'todo' }],
          counts: { created: 1, skipped: 0, failed: 0 },
        }),
        { status: 200 },
      );
    });
    const res = await createClient('http://gw').createBulk('a\nb', { repo: 'r', priority: 1 });
    expect(seenUrl).toBe('http://gw/tasks/bulk');
    expect(body).toMatchObject({ raw: 'a\nb', repo: 'r', priority: 1 });
    expect(res.counts.created).toBe(1);
    expect(res.results[0]!.kind).toBe('bug');
  });

  it('moveTask PATCHes the status endpoint', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(JSON.stringify({ ...TASK, status: 'wip' }), { status: 200 });
    });
    const task = await createClient('http://gw').moveTask('t1', 'wip');
    expect(seenUrl).toBe('http://gw/tasks/t1/status');
    expect(task.status).toBe('wip');
  });

  it('surfaces a gateway error message', async () => {
    stubFetch(() => new Response(JSON.stringify({ message: 'task t9 not found' }), { status: 404 }));
    await expect(createClient('http://gw').moveTask('t9', 'wip')).rejects.toThrow(/task t9 not found/);
  });

  it('explains a connection failure', async () => {
    stubFetch(() => {
      throw new Error('ECONNREFUSED');
    });
    await expect(createClient('http://gw').listTasks()).rejects.toThrow(/cannot reach the midnite gateway/);
  });
});

const CHECK_RUN = {
  id: 'cr1',
  taskId: 't1',
  trigger: 'manual',
  startedAt: '2026-06-23T10:00:00.000Z',
  finishedAt: '2026-06-23T10:00:01.000Z',
  passed: true,
  results: [{ name: 'test', command: 'pnpm test', exitCode: 0, passed: true, durationMs: 800, output: '' }],
};

describe('triggerCheck', () => {
  it('POSTs to /tasks/:id/check and returns the run', async () => {
    stubFetch(() => new Response(JSON.stringify({ run: CHECK_RUN }), { status: 200 }));
    const run = await createClient('http://gw').triggerCheck('t1');
    expect(run.id).toBe('cr1');
    expect(run.passed).toBe(true);
    expect(run.results).toHaveLength(1);
  });
});

describe('getCheckRuns', () => {
  it('GETs /tasks/:id/check-runs and returns the run list', async () => {
    stubFetch(() => new Response(JSON.stringify({ runs: [CHECK_RUN] }), { status: 200 }));
    const runs = await createClient('http://gw').getCheckRuns('t1');
    expect(runs).toHaveLength(1);
    expect(runs[0]?.trigger).toBe('manual');
  });
});

describe('exportTask', () => {
  it('GETs the markdown export route and returns the body as text', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response('# do the thing\n\n*Exported 2026-06-24*\n', {
        status: 200,
        headers: { 'content-type': 'text/markdown' },
      });
    });
    const md = await createClient('http://gw').exportTask('t1');
    expect(seenUrl).toBe('http://gw/tasks/t1/export?format=md');
    expect(md).toContain('# do the thing');
  });

  it('surfaces a 404 for an unknown task', async () => {
    stubFetch(() => new Response(JSON.stringify({ message: 'task t9 not found' }), { status: 404 }));
    await expect(createClient('http://gw').exportTask('t9')).rejects.toThrow(/task t9 not found/);
  });
});

describe('exportArchive (Phase 49 D)', () => {
  const summary = {
    schemaVersion: 68,
    appVersion: '0.1.0',
    createdAt: '2026-07-05T00:00:00.000Z',
    domains: ['tasks', 'notes'],
    secretsMode: 'excluded' as const,
    counts: { tasks: 2, notes: 0 },
  };

  it('sends the domains allowlist, and returns the server filename + parsed summary + body', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
        status: 200,
        headers: {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="midnite-backup-2026.zip"',
          'x-midnite-backup-manifest': JSON.stringify(summary),
        },
      });
    });

    const { filename, summary: got, body } = await createClient('http://gw').exportArchive({
      domains: ['tasks', 'notes'],
    });
    expect(seenUrl).toBe('http://gw/portability/export?domains=tasks%2Cnotes');
    expect(filename).toBe('midnite-backup-2026.zip');
    expect(got?.counts.tasks).toBe(2);
    const bytes = new Uint8Array(await new Response(body).arrayBuffer());
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]); // PK zip magic
  });

  it('falls back to a client-side filename when content-disposition is absent', async () => {
    stubFetch(() => new Response(new Uint8Array([1]), { status: 200 }));
    const { filename, summary: got } = await createClient('http://gw').exportArchive();
    expect(filename).toMatch(/^midnite-backup-.*\.zip$/);
    expect(got).toBeNull(); // no manifest header → null summary
  });
});

describe('previewImport / importArchive (Phase 49 D)', () => {
  const PREVIEW = {
    manifest: {
      schemaVersion: 68,
      appVersion: '0.1.0',
      createdAt: '2026-07-05T00:00:00.000Z',
      domains: ['tasks'],
      secretsMode: 'excluded' as const,
    },
    domainCounts: { tasks: 3 },
    conflicts: { tasks: ['t1'] },
    compat: 'ok' as const,
    importable: true,
  };
  const RESULT = { ok: true, mode: 'merge' as const, inserted: { tasks: 2 }, skipped: { tasks: 1 }, reindexed: true };

  it('previewImport POSTs the archive as multipart and validates the preview', async () => {
    let seenUrl = '';
    let method = '';
    let form: FormData | undefined;
    stubFetch((url, init) => {
      seenUrl = url;
      method = init?.method ?? '';
      form = init?.body as FormData;
      return new Response(JSON.stringify(PREVIEW), { status: 200 });
    });
    const preview = await createClient('http://gw').previewImport(Buffer.from('PKzip'), 'backup.zip');
    expect(seenUrl).toBe('http://gw/portability/import/preview');
    expect(method).toBe('POST');
    expect(form?.get('archive')).toBeInstanceOf(Blob);
    expect(preview.domainCounts.tasks).toBe(3);
    expect(preview.importable).toBe(true);
  });

  it('importArchive sends the mode field and validates the result', async () => {
    let form: FormData | undefined;
    stubFetch((_url, init) => {
      form = init?.body as FormData;
      return new Response(JSON.stringify(RESULT), { status: 200 });
    });
    const result = await createClient('http://gw').importArchive(Buffer.from('PK'), { mode: 'merge' }, 'backup.zip');
    expect(form?.get('mode')).toBe('merge');
    expect(result.inserted.tasks).toBe(2);
    expect(result.skipped.tasks).toBe(1);
  });

  it('propagates a gateway error (e.g. a rejected newer-than-us archive)', async () => {
    stubFetch(() => new Response(JSON.stringify({ message: 'archive schema is newer-archive' }), { status: 422 }));
    await expect(
      createClient('http://gw').previewImport(Buffer.from('PK'), 'backup.zip'),
    ).rejects.toThrow(/newer-archive/);
  });
});
