import { rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  it('listTasks builds the status query and validates the paged summary response', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(JSON.stringify({ items: [TASK], total: 1 }), { status: 200 });
    });
    const { tasks, total } = await createClient('http://gw').listTasks('todo');
    expect(seenUrl).toBe('http://gw/tasks?status=todo');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.id).toBe('t1');
    expect(total).toBe(1);
  });

  it('listTasks threads page/limit into the query', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
    });
    await createClient('http://gw').listTasks('todo', { page: 2, limit: 50 });
    expect(seenUrl).toBe('http://gw/tasks?status=todo&page=2&limit=50');
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

  it('sendSessionPrompt posts the reply text to the session prompt endpoint', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    stubFetch((url, init) => {
      seenUrl = url;
      seenInit = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    await createClient('http://gw').sendSessionPrompt('t1', 'keep going');
    expect(seenUrl).toBe('http://gw/sessions/t1/prompt');
    expect(seenInit?.method).toBe('POST');
    expect(JSON.parse(String(seenInit?.body))).toEqual({ text: 'keep going' });
  });

  it('sendSessionPrompt surfaces the 409 no-live-session message', async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ message: 'session t1 has no live agent session — resolve the task instead of replying' }), {
          status: 409,
        }),
    );
    await expect(createClient('http://gw').sendSessionPrompt('t1', 'hi')).rejects.toThrow(
      /resolve the task instead of replying/,
    );
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

describe('import (Phase 49 D)', () => {
  const manifest = {
    schemaVersion: 68,
    appVersion: '0.1.0',
    createdAt: '2026-07-05T00:00:00.000Z',
    domains: ['tasks'],
    secretsMode: 'excluded' as const,
  };
  const preview = {
    manifest,
    domainCounts: { tasks: 2 },
    conflicts: { tasks: ['t1'] },
    compat: 'ok' as const,
    importable: true,
  };
  let seq = 0;
  let archivePath = '';

  beforeEach(() => {
    // openAsBlob needs a real file on disk — write a tiny zip-magic stub.
    archivePath = join(tmpdir(), `midnite-import-test-${process.pid}-${seq++}.zip`);
    writeFileSync(archivePath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  });
  afterEach(() => rmSync(archivePath, { force: true }));

  it('previewImport POSTs the archive as multipart and validates the ImportPreview', async () => {
    let url = '';
    let method = '';
    let body: unknown;
    stubFetch((u, init) => {
      url = u;
      method = init?.method ?? '';
      body = init?.body;
      return new Response(JSON.stringify(preview), { status: 200 });
    });
    const got = await createClient('http://gw').previewImport(archivePath);
    expect(url).toBe('http://gw/portability/import/preview');
    expect(method).toBe('POST');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).has('archive')).toBe(true);
    expect(got.domainCounts.tasks).toBe(2);
    expect(got.compat).toBe('ok');
  });

  it('importArchive threads mode + passphrase into the form and returns the ImportResult', async () => {
    let form: FormData | undefined;
    stubFetch((_u, init) => {
      form = init?.body as FormData;
      return new Response(
        JSON.stringify({
          ok: true,
          mode: 'replace',
          inserted: { tasks: 2 },
          skipped: {},
          reindexed: true,
        }),
        { status: 200 },
      );
    });
    const res = await createClient('http://gw').importArchive(archivePath, {
      mode: 'replace',
      passphrase: 'hunter2',
    });
    expect(form?.get('mode')).toBe('replace');
    expect(form?.get('passphrase')).toBe('hunter2');
    expect(form?.has('archive')).toBe(true);
    expect(res.mode).toBe('replace');
    expect(res.inserted.tasks).toBe(2);
  });

  it('omits the passphrase field when none is given', async () => {
    let form: FormData | undefined;
    stubFetch((_u, init) => {
      form = init?.body as FormData;
      return new Response(
        JSON.stringify({ ok: true, mode: 'merge', inserted: {}, skipped: {}, reindexed: true }),
        { status: 200 },
      );
    });
    await createClient('http://gw').importArchive(archivePath, { mode: 'merge' });
    expect(form?.has('passphrase')).toBe(false);
    expect(form?.get('mode')).toBe('merge');
  });
});

describe('createClient — usage + ops (Phase 61 I)', () => {
  const ATTR = {
    from: null,
    to: null,
    groupBy: 'repo',
    totals: {
      sessions: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      estCostUsd: 0,
      measuredCostUsd: 0,
      estimatedCostUsd: 0,
      unpricedSessions: 0,
    },
    buckets: [],
  };
  const OPS = {
    gauges: { queueDepth: null, slotsUsed: null, slotsTotal: null, lastTickLatencyMs: null, updatedAt: null },
    throughputByDay: [],
    durationBuckets: { lt1s: 0, lt5s: 0, lt30s: 0, lt2m: 0, gte2m: 0 },
    outcomeCounts: { done: 0, abandoned: 0, failed: 0, cancelled: 0 },
  };

  it('usageAttribution builds the groupBy + window query and validates the response', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(JSON.stringify(ATTR), { status: 200 });
    });
    const res = await createClient('http://gw').usageAttribution({
      groupBy: 'project',
      from: '2026-07-01T00:00:00.000Z',
    });
    expect(seenUrl).toContain('/usage/attribution?');
    expect(seenUrl).toContain('groupBy=project');
    expect(seenUrl).toContain('from=2026-07-01');
    expect(res.groupBy).toBe('repo');
  });

  it('opsMetrics hits /metrics/ops and validates the summary', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(JSON.stringify(OPS), { status: 200 });
    });
    const res = await createClient('http://gw').opsMetrics();
    expect(seenUrl).toBe('http://gw/metrics/ops');
    expect(res.outcomeCounts.done).toBe(0);
  });

  const DIGEST = {
    id: 'd1',
    createdAt: '2026-07-08T00:00:00.000Z',
    from: '2026-07-07T00:00:00.000Z',
    to: '2026-07-08T00:00:00.000Z',
    counts: { shipped: 3, failed: 1, needsAttention: 1 },
    sections: [{ name: 'midnite', shipped: 3, failed: 1 }],
    highlights: [{ taskId: 't9', title: 'Fix flake', outcome: 'abandoned', note: 'still flaky' }],
    spend: { totalUsd: 4.2, measuredUsd: 4.2, sessions: 5 },
    cycle: { tasks: 4, p50Ms: 120_000, p90Ms: 480_000 },
    headline: '3 shipped, 1 failed.',
    markdown: '# Fleet digest',
  };
  const DIGEST_LIST_ITEM = {
    id: 'd1',
    createdAt: '2026-07-08T00:00:00.000Z',
    from: '2026-07-07T00:00:00.000Z',
    to: '2026-07-08T00:00:00.000Z',
    headline: '3 shipped, 1 failed.',
    counts: { shipped: 3, failed: 1, needsAttention: 1 },
  };

  it('listDigests unwraps the feed and threads the limit query', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(JSON.stringify({ digests: [DIGEST_LIST_ITEM] }), { status: 200 });
    });
    const digests = await createClient('http://gw').listDigests(5);
    expect(seenUrl).toBe('http://gw/digests?limit=5');
    expect(digests).toHaveLength(1);
    expect(digests[0]!.id).toBe('d1');
  });

  it('listDigests omits the limit query when unset', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(JSON.stringify({ digests: [] }), { status: 200 });
    });
    await createClient('http://gw').listDigests();
    expect(seenUrl).toBe('http://gw/digests');
  });

  it('getDigest unwraps a single full digest', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response(JSON.stringify({ digest: DIGEST }), { status: 200 });
    });
    const d = await createClient('http://gw').getDigest('d1');
    expect(seenUrl).toBe('http://gw/digests/d1');
    expect(d.headline).toBe('3 shipped, 1 failed.');
    expect(d.spend?.sessions).toBe(5);
  });

  it('exportDigest requests markdown and returns the raw body', async () => {
    let seenUrl = '';
    stubFetch((url) => {
      seenUrl = url;
      return new Response('# Fleet digest', {
        status: 200,
        headers: { 'content-type': 'text/markdown' },
      });
    });
    const md = await createClient('http://gw').exportDigest('d1');
    expect(seenUrl).toBe('http://gw/digests/d1/export?format=md');
    expect(md).toBe('# Fleet digest');
  });
});
