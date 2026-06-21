import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient, parseStatus, resolveBaseUrl } from './client';

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
