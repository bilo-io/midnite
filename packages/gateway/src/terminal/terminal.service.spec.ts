import { afterEach, describe, expect, it } from 'vitest';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseConfig, type MidniteConfig, type ServerTerminalMessage } from '@midnite/shared';
import type { TasksService } from '../tasks/tasks.service';
import type { ProjectsService } from '../projects/projects.service';
import type { AgentsService } from '../agents/agents.service';
import {
  TerminalService,
  buildShellInitCommand,
  scrubSecretEnv,
  trimRingByBytes,
  type TerminalSubscriber,
} from './terminal.service';
import type { ApprovalService } from './approval.service';

function makeConfig(terminal: Record<string, unknown>): MidniteConfig {
  return parseConfig({ agent: {}, terminal, knowledge: {}, gateway: {} });
}

const noTasks = { listTasks: () => [] } as unknown as TasksService;
const noProjects = { workDirFor: () => undefined } as unknown as ProjectsService;
const noAgents = { getAgentCli: () => 'claude' as const } as unknown as AgentsService;

// PTY-mechanics tests don't exercise approvals; a no-op stub satisfies the wiring.
const noApprovals = {
  mintSecret: () => 'secret',
  verifySecret: () => true,
  requestDecision: async () => ({ decision: 'ask' as const }),
  resolveByUser: () => {},
  replayPending: () => {},
  clearSession: () => {},
} as unknown as ApprovalService;

function makeService(terminal: Record<string, unknown>): TerminalService {
  return new TerminalService(makeConfig(terminal), noTasks, noProjects, noAgents, noApprovals);
}

function decode(data: string): string {
  return Buffer.from(data, 'base64').toString('utf8');
}

function makeCollector(): {
  sub: TerminalSubscriber;
  messages: ServerTerminalMessage[];
  waitFor: (
    pred: (m: ServerTerminalMessage) => boolean,
    timeoutMs?: number,
  ) => Promise<ServerTerminalMessage>;
} {
  const messages: ServerTerminalMessage[] = [];
  const waiters: Array<{
    pred: (m: ServerTerminalMessage) => boolean;
    resolve: (m: ServerTerminalMessage) => void;
  }> = [];

  const sub: TerminalSubscriber = {
    send(message) {
      messages.push(message);
      for (const w of [...waiters]) {
        if (w.pred(message)) {
          waiters.splice(waiters.indexOf(w), 1);
          w.resolve(message);
        }
      }
    },
  };

  function waitFor(
    pred: (m: ServerTerminalMessage) => boolean,
    timeoutMs = 4000,
  ): Promise<ServerTerminalMessage> {
    const existing = messages.find(pred);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout waiting for message')), timeoutMs);
      waiters.push({
        pred,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
      });
    });
  }

  return { sub, messages, waitFor };
}

describe('trimRingByBytes', () => {
  it('drops the oldest frames until within the limit', () => {
    const ring = [{ bytes: 10 }, { bytes: 10 }, { bytes: 10 }, { bytes: 10 }];
    const total = trimRingByBytes(ring, 40, 25);
    expect(total).toBe(20);
    expect(ring).toHaveLength(2);
  });

  it('keeps a single oversized frame rather than emptying the ring', () => {
    const ring = [{ bytes: 100 }];
    const total = trimRingByBytes(ring, 100, 25);
    expect(total).toBe(100);
    expect(ring).toHaveLength(1);
  });
});

describe('TerminalService', () => {
  let service: TerminalService | null = null;

  afterEach(() => {
    service?.onModuleDestroy();
    service = null;
  });

  it('spawns a PTY, streams output, and echoes input back', async () => {
    service = makeService({ command: 'cat' });
    const c = makeCollector();

    service.attach('s1', c.sub, { cols: 80, rows: 24 });
    await c.waitFor((m) => m.type === 'status' && m.phase === 'ready');

    const token = service.mintToken('s1'); // unrelated, just exercises store
    expect(typeof token).toBe('string');

    service.write('s1', Buffer.from('ping\n', 'utf8').toString('base64'));
    const out = await c.waitFor((m) => m.type === 'output' && decode(m.data).includes('ping'));
    expect(out.type).toBe('output');

    const phases = c.messages.filter((m) => m.type === 'status').map((m) => m.phase);
    expect(phases[0]).toBe('spawning');
    expect(phases).toContain('ready');

    const seqs = c.messages.filter((m) => m.type === 'output').map((m) => m.seq);
    const sorted = [...seqs].sort((a, b) => a - b);
    expect(seqs).toEqual(sorted); // monotonic, non-decreasing
  });

  it('injects MIDNITE_* hook env for a claude command, surviving the secret scrub', async () => {
    // A fake `claude` (basename triggers approval wiring) that prints its env and exits.
    const dir = mkdtempSync(join(tmpdir(), 'midnite-claude-'));
    const fakeClaude = join(dir, 'claude');
    writeFileSync(fakeClaude, '#!/bin/sh\nenv\n');
    chmodSync(fakeClaude, 0o755);

    service = makeService({
      command: fakeClaude,
      approvals: { enabled: true },
      inheritSecrets: false,
    });
    const c = makeCollector();
    service.attach('claude-1', c.sub, { cols: 80, rows: 24 });
    await c.waitFor((m) => m.type === 'status' && m.phase === 'exited', 8000);

    const printed = c.messages
      .filter((m): m is Extract<ServerTerminalMessage, { type: 'output' }> => m.type === 'output')
      .map((m) => decode(m.data))
      .join('');

    // Injected after scrubSecretEnv, so the *_SECRET key isn't stripped.
    expect(printed).toContain('MIDNITE_SESSION_ID=claude-1');
    expect(printed).toMatch(/MIDNITE_HOOK_SECRET=.+/);
    expect(printed).toContain('MIDNITE_GATEWAY_URL=');
  });

  it('does not inject MIDNITE_* for a non-claude command even with approvals enabled', async () => {
    service = makeService({ command: 'sh', args: ['-c', 'env'], approvals: { enabled: true } });
    const c = makeCollector();
    service.attach('shell-1', c.sub, { cols: 80, rows: 24 });
    await c.waitFor((m) => m.type === 'status' && m.phase === 'exited', 8000);

    const printed = c.messages
      .filter((m): m is Extract<ServerTerminalMessage, { type: 'output' }> => m.type === 'output')
      .map((m) => decode(m.data))
      .join('');
    expect(printed).not.toContain('MIDNITE_SESSION_ID=');
  });

  it('reattaches a second subscriber and replays scrollback', async () => {
    service = makeService({ command: 'cat' });
    const a = makeCollector();
    service.attach('s2', a.sub, { cols: 80, rows: 24 });
    await a.waitFor((m) => m.type === 'status' && m.phase === 'ready');
    service.write('s2', Buffer.from('hello\n', 'utf8').toString('base64'));
    await a.waitFor((m) => m.type === 'output' && decode(m.data).includes('hello'));

    const b = makeCollector();
    service.attach('s2', b.sub, { cols: 80, rows: 24 });
    await b.waitFor((m) => m.type === 'status' && m.phase === 'reattached');
    const replayed = await b.waitFor(
      (m) => m.type === 'output' && decode(m.data).includes('hello'),
    );
    expect(replayed.type).toBe('output');
  });

  it('emits an exited status and drops the handle when the process exits', async () => {
    service = makeService({ command: 'sh', args: ['-c', 'exit 7'] });
    const c = makeCollector();
    service.attach('s3', c.sub, { cols: 80, rows: 24 });

    const exit = await c.waitFor((m) => m.type === 'status' && m.phase === 'exited');
    if (exit.type === 'status') expect(exit.exitCode).toBe(7);
    expect(service.has('s3')).toBe(false);
  });

  it('kills all PTYs on module destroy', async () => {
    service = makeService({ command: 'cat' });
    const a = makeCollector();
    const b = makeCollector();
    service.attach('k1', a.sub, { cols: 80, rows: 24 });
    service.attach('k2', b.sub, { cols: 80, rows: 24 });
    await a.waitFor((m) => m.type === 'status' && m.phase === 'ready');
    await b.waitFor((m) => m.type === 'status' && m.phase === 'ready');
    expect(service.has('k1')).toBe(true);
    expect(service.has('k2')).toBe(true);

    service.onModuleDestroy();
    expect(service.has('k1')).toBe(false);
    expect(service.has('k2')).toBe(false);
  });

  it('rejects an unknown or already-consumed token', () => {
    service = makeService({ command: 'cat' });
    expect(service.verifyToken('nope', 'x')).toBe(false);
    service.mintToken('sx');
    expect(service.verifyToken('sx', 'wrong')).toBe(false); // wrong value, consumes
    const again = service.mintToken('sx');
    expect(service.verifyToken('sx', again)).toBe(true); // correct
    expect(service.verifyToken('sx', again)).toBe(false); // single-use
  });

  it('drops a default shell into the project dir and clears the screen on spawn', async () => {
    // Default shell (no `command`), cwd falls back to process.cwd(). The init
    // line is echoed by the interactive shell, so it shows up in the stream.
    service = makeService({});
    const c = makeCollector();
    service.attach('init1', c.sub, { cols: 80, rows: 24 });
    await c.waitFor((m) => m.type === 'status' && m.phase === 'ready');

    const echoed = await c.waitFor(
      (m) => m.type === 'output' && decode(m.data).includes('&& clear'),
      8000,
    );
    expect(echoed.type).toBe('output');
  });

  it('reports the backing command in the ready status', async () => {
    service = makeService({ command: 'cat' });
    const c = makeCollector();
    service.attach('cmd1', c.sub, { cols: 80, rows: 24 });
    const ready = await c.waitFor((m) => m.type === 'status' && m.phase === 'ready');
    if (ready.type === 'status') expect(ready.command).toBe('cat');
  });

  it('rejects new PTYs past the configured maxSessions', async () => {
    service = makeService({ command: 'cat', maxSessions: 1 });
    const a = makeCollector();
    service.attach('cap1', a.sub, { cols: 80, rows: 24 });
    await a.waitFor((m) => m.type === 'status' && m.phase === 'ready');

    const b = makeCollector();
    service.attach('cap2', b.sub, { cols: 80, rows: 24 });
    const err = await b.waitFor((m) => m.type === 'error');
    expect(err).toMatchObject({ type: 'error', code: 'limit' });
    expect(service.has('cap2')).toBe(false);
  });
});

describe('buildShellInitCommand', () => {
  it('cds into the cwd and clears for the default shell', () => {
    expect(buildShellInitCommand(undefined, '/home/me/proj')).toBe(
      "cd '/home/me/proj' && clear\r",
    );
  });

  it('single-quotes paths with spaces and embedded quotes', () => {
    expect(buildShellInitCommand(undefined, "/a b/it's")).toBe(
      "cd '/a b/it'\\''s' && clear\r",
    );
  });

  it('returns undefined for a configured command (it owns its own stdin)', () => {
    expect(buildShellInitCommand('claude', '/home/me/proj')).toBeUndefined();
    expect(buildShellInitCommand('cat', '/home/me/proj')).toBeUndefined();
  });

  it('launches the preferred agent CLI after cd-ing on first open', () => {
    expect(buildShellInitCommand(undefined, '/home/me/proj', 'claude')).toBe(
      "cd '/home/me/proj' && clear && claude\r",
    );
  });

  it('falls back to a bare prompt when no launch command is given', () => {
    expect(buildShellInitCommand(undefined, '/home/me/proj', '')).toBe(
      "cd '/home/me/proj' && clear\r",
    );
  });
});

describe('scrubSecretEnv', () => {
  it('strips secret-looking keys and keeps the rest', () => {
    const out = scrubSecretEnv({
      PATH: '/usr/bin',
      HOME: '/Users/me',
      ANTHROPIC_API_KEY: 'sk-secret',
      GITHUB_TOKEN: 'ghp_x',
      AWS_SECRET_ACCESS_KEY: 'y',
      DB_PASSWORD: 'z',
      MY_PRIVATE_KEY: 'k',
    });
    expect(out).toEqual({ PATH: '/usr/bin', HOME: '/Users/me' });
  });
});
