import React from 'react';
import { render } from 'ink-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TASKS_WS_PATH, type Task, type TaskBoardEvent } from '@midnite/shared';

// Integration coverage for the interactive `midnite watch` dashboard (Phase 32
// Themes B2/D1/E1/E2). The existing Dashboard.test.tsx renders panels with static
// props; here we drive the *real* `<Dashboard>` through simulated keystrokes and a
// mocked gateway, exercising the keyboard nav + task-move + live-WS paths the phase
// verification flagged as "requires a real TTY".

interface FakeWsOpts {
  onReady?: () => void;
  onMessage?: (event: unknown) => void;
  onError?: () => void;
}
interface FakeWs {
  url: string;
  opts: FakeWsOpts;
}

// `vi.hoisted` so the array exists when the hoisted `vi.mock` factory runs.
const hoisted = vi.hoisted(() => ({ wsHandles: [] as FakeWs[] }));

vi.mock('../ws.js', () => ({
  gatewayWsUrl: (base: string) => base.replace(/^http/, 'ws'),
  openWs: (url: string, opts: FakeWsOpts) => {
    hoisted.wsHandles.push({ url, opts });
    // The real helper fires onReady once the socket connects.
    opts.onReady?.();
    return { send: () => {}, close: () => {} };
  },
}));

import { Dashboard } from './Dashboard.js';

const BASE = 'http://localhost:7777';

function makeTask(over: Partial<Task> & Pick<Task, 'id' | 'title' | 'status'>): Task {
  return {
    events: [],
    tags: [],
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    dependsOn: [],
    ...over,
  } as Task;
}

const seed: Task[] = [
  makeTask({ id: 'c0001aa', title: 'Charlie', status: 'backlog' }),
  makeTask({ id: 'a0001aa', title: 'Alpha', status: 'todo' }),
  makeTask({ id: 'b0001aa', title: 'Bravo', status: 'wip', sessionId: 'sess-b' }),
  makeTask({ id: 'd0001aa', title: 'Delta', status: 'wip', sessionId: 'sess-d' }),
];

interface PatchCall {
  id: string;
  status: string;
}
let patchCalls: PatchCall[];
let tokenFetches: string[];

// Flush several macrotask rounds so React's passive effects (useEffect) and the
// async REST fetch chain both settle before we assert. A single setTimeout(0) races
// the scheduler, so we pump a handful of rounds.
const tick = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

function jsonResponse(data: unknown): Response {
  return { ok: true, json: async () => data } as unknown as Response;
}

beforeEach(() => {
  hoisted.wsHandles.length = 0;
  patchCalls = [];
  tokenFetches = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      const url = String(input);
      if (url.endsWith('/tasks')) return jsonResponse(seed);
      if (url.endsWith('/pool')) return jsonResponse({ slots: [{ id: 'slot-1', status: 'idle' }] });
      const tokenMatch = url.match(/\/sessions\/([^/]+)\/terminal-token$/);
      if (tokenMatch) {
        tokenFetches.push(decodeURIComponent(tokenMatch[1]!));
        return jsonResponse({ token: 'tok' });
      }
      const statusMatch = url.match(/\/tasks\/([^/]+)\/status$/);
      if (statusMatch && init?.method === 'PATCH') {
        patchCalls.push({
          id: decodeURIComponent(statusMatch[1]!),
          status: (JSON.parse(init.body ?? '{}') as { status: string }).status,
        });
        return jsonResponse({});
      }
      return jsonResponse({});
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function tasksWs(): FakeWs {
  const handle = hoisted.wsHandles.find((w) => w.url.includes(TASKS_WS_PATH));
  if (!handle) throw new Error('tasks WS was never opened');
  return handle;
}

describe('Dashboard (integration)', () => {
  it('seeds the board from REST into the right columns and shows connected (A1/B1)', async () => {
    const { lastFrame } = render(<Dashboard baseUrl={BASE} />);
    await tick();
    const frame = lastFrame() ?? '';
    expect(frame).toContain('connected');
    // Per-column counts prove the four seed tasks loaded into the right columns.
    // (Card titles truncate in the narrow 5-column layout, so we assert on counts.)
    expect(frame).toContain('BACKLOG (1)');
    expect(frame).toContain('TODO (1)');
    expect(frame).toContain('WIP (2)');
  });

  it('moves the focused task one column right on "m" and updates optimistically (E2)', async () => {
    const { stdin, lastFrame } = render(<Dashboard baseUrl={BASE} />);
    await tick();
    expect(lastFrame() ?? '').toContain('TODO (1)');
    // Focus starts on column 0 (backlog) → Charlie; "m" moves it backlog → todo.
    stdin.write('m');
    await tick();
    expect(patchCalls).toContainEqual({ id: 'c0001aa', status: 'todo' });
    // Optimistic reconcile moves Charlie into todo before any server round-trip.
    expect(lastFrame() ?? '').toContain('TODO (2)');
  });

  it('keyboard column nav retargets which task a move affects (E1 + E2)', async () => {
    const { stdin } = render(<Dashboard baseUrl={BASE} />);
    await tick();
    // backlog → todo → wip; focus resets to the first card in the column (Bravo).
    stdin.write('l');
    await tick();
    stdin.write('l');
    await tick();
    // Move left: wip → todo, on the now-focused wip task.
    stdin.write('M');
    await tick();
    // If nav had not moved focus off backlog, "M" would no-op (backlog is column 0),
    // so a PATCH on the wip task proves the focus moved.
    expect(patchCalls).toContainEqual({ id: 'b0001aa', status: 'todo' });
  });

  it('Tab switches the session the log panel subscribes to (D1)', async () => {
    const { stdin } = render(<Dashboard baseUrl={BASE} />);
    await tick();
    // First wip task (Bravo) is auto-selected and its terminal is subscribed.
    expect(tokenFetches).toContain('sess-b');
    stdin.write('\t');
    await tick();
    // Tab cycles to the next wip task (Delta) → its terminal is subscribed.
    expect(tokenFetches).toContain('sess-d');
  });

  it('applies a live task.created event from the board WS without a refetch (B2)', async () => {
    const { lastFrame } = render(<Dashboard baseUrl={BASE} />);
    await tick();
    expect(lastFrame() ?? '').not.toContain('Echo');

    const event: TaskBoardEvent = {
      type: 'task.created',
      at: '2026-06-26T00:00:00.000Z',
      task: makeTask({ id: 'e0001aa', title: 'Echo', status: 'done' }),
    };
    tasksWs().opts.onMessage?.(event);
    await tick();
    expect(lastFrame() ?? '').toContain('Echo');
  });
});
