import { spawnSync } from 'node:child_process';
import { Injectable, Logger } from '@nestjs/common';
import type { Spawner, SpawnSpec, SpawnHandle, SpawnDisposable } from './spawner';

type NodePtyModule = typeof import('node-pty');

/** Thrown when `tmux` (or its node-pty attach stream) is unusable — surfaced to
 *  the caller, never a silent fallback to `pty` (Phase 17 §B). */
export class TmuxUnavailableError extends Error {}

/** Deterministic session name so boot-time rediscovery can match persisted
 *  running sessions without extra bookkeeping (Phase 17 §6). */
export const TMUX_PREFIX = 'midnite-';

export function sessionName(sessionId: string): string {
  return `${TMUX_PREFIX}${sessionId}`;
}

/** Single-quote a token for safe interpolation into a /bin/sh command line. */
function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/**
 * Build the single shell-command string tmux runs for a session. tmux executes
 * a command argument via the default shell, so we `exec env K=V … cmd args`:
 * `env` applies the fully-resolved environment, and `exec` replaces the shell so
 * the inner process's signals and exit status surface directly (read back via
 * `pane_dead_status`). Pure/exported for testing.
 */
export function buildSessionCommand(spec: Pick<SpawnSpec, 'command' | 'args' | 'env'>): string {
  const envPairs = Object.entries(spec.env).map(([k, v]) => `${k}=${shQuote(v)}`);
  const parts = ['exec', 'env', ...envPairs, shQuote(spec.command), ...spec.args.map(shQuote)];
  return parts.join(' ');
}

/** argv for `tmux new-session` that starts a detached session of the given size. */
export function buildNewSessionArgs(name: string, spec: SpawnSpec): string[] {
  return [
    'new-session',
    '-d',
    '-s',
    name,
    '-x',
    String(spec.cols ?? 120),
    '-y',
    String(spec.rows ?? 32),
    '-c',
    spec.cwd,
    buildSessionCommand(spec),
  ];
}

/** Parse `tmux list-sessions -F '#{session_name}'` into the midnite session ids
 *  (prefix stripped, non-midnite sessions ignored). Pure/exported for testing. */
export function parseSessionList(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith(TMUX_PREFIX))
    .map((line) => line.slice(TMUX_PREFIX.length));
}

/** Parse `#{pane_dead}|#{pane_dead_status}` into a dead flag + exit status.
 *  A dead pane with no recorded status reads as exit 0. Pure/exported for testing. */
export function parsePaneStatus(stdout: string): { dead: boolean; status: number } {
  const [deadRaw, statusRaw] = stdout.trim().split('|');
  const dead = deadRaw === '1';
  const status = Number.parseInt(statusRaw ?? '', 10);
  return { dead, status: Number.isNaN(status) ? 0 : status };
}

// How often we poll a session's pane for the inner process's exit. `remain-on-exit`
// keeps the dead pane (and its exit status) around so the poll can read it before
// we tear the session down.
const POLL_INTERVAL_MS = 400;

/**
 * Durable backend (Phase 17 §B). Each session is a `tmux new-session -d` that
 * outlives the gateway; the live byte stream is a node-pty running `tmux
 * attach`, so the entire ring-buffer / resize / streaming path is reused
 * unchanged. The inner process's exit is observed via `remain-on-exit` +
 * `pane_dead_status` so callers still get the real exit code; only `kill` /
 * idle-reap / graceful-stop tears the session down — detaching the attach-pty
 * leaves it running for a restart to reattach.
 */
@Injectable()
export class TmuxSpawner implements Spawner {
  private readonly logger = new Logger(TmuxSpawner.name);
  private nodePty: NodePtyModule | null = null;
  private available: boolean | null = null;
  readonly durable = true;

  spawn(spec: SpawnSpec): SpawnHandle {
    this.ensureAvailable();
    const id = spec.sessionId ?? `adhoc-${spec.command}`;
    const name = sessionName(id);
    // A stale same-named session (e.g. a crashed run we never reaped) would make
    // new-session fail; clear it first so spawn is idempotent.
    this.tmux(['kill-session', '-t', name]);
    // Create the session and set remain-on-exit in one tmux invocation (chained
    // with `;`) so the option is in place before the pane process can exit —
    // remain-on-exit keeps the dead pane (and its exit status) around for the
    // poll to read the real exit code before we reap the session.
    const created = this.tmux([
      ...buildNewSessionArgs(name, spec),
      ';',
      'set-option',
      '-t',
      name,
      'remain-on-exit',
      'on',
    ]);
    if (created.status !== 0) {
      throw new TmuxUnavailableError(
        `tmux new-session failed: ${created.stderr?.toString().trim() || `exit ${created.status}`}`,
      );
    }
    return this.attach(name, spec.cols, spec.rows);
  }

  reattach(spec: { sessionId: string; cols?: number; rows?: number }): SpawnHandle | null {
    if (!this.isAvailable()) return null;
    const name = sessionName(spec.sessionId);
    if (this.tmux(['has-session', '-t', name]).status !== 0) return null;
    return this.attach(name, spec.cols, spec.rows);
  }

  listSessions(): string[] {
    if (!this.isAvailable()) return [];
    const res = this.tmux(['list-sessions', '-F', '#{session_name}']);
    if (res.status !== 0) return []; // no server running ⇒ no sessions
    return parseSessionList(res.stdout?.toString() ?? '');
  }

  killSession(sessionId: string): void {
    if (!this.isAvailable()) return;
    this.tmux(['kill-session', '-t', sessionName(sessionId)]);
  }

  // ---- internals ----

  /** Wire a node-pty `tmux attach` stream + exit poll into a SpawnHandle. */
  private attach(name: string, cols?: number, rows?: number): SpawnHandle {
    const pty = this.loadPty();
    const proc = pty.spawn('tmux', ['attach-session', '-t', name], {
      name: 'xterm-256color',
      cols: cols ?? 120,
      rows: rows ?? 32,
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
    });

    const exitListeners = new Set<(e: { exitCode: number; signal?: number }) => void>();
    let exited = false;
    // A holder (not a bare `let`) so `fireExit` and the interval callback can each
    // reference the timer without a use-before-define cycle between them.
    const timer: { poll?: ReturnType<typeof setInterval> } = {};
    const stopPoll = (): void => {
      if (timer.poll) clearInterval(timer.poll);
    };

    const fireExit = (exitCode: number): void => {
      if (exited) return;
      exited = true;
      stopPoll();
      // The inner process is gone; reap the (remain-on-exit) session so it isn't
      // rediscovered as live on a later boot.
      this.tmux(['kill-session', '-t', name]);
      for (const l of [...exitListeners]) l({ exitCode });
      try {
        proc.kill();
      } catch {
        // attach client already gone
      }
    };

    timer.poll = setInterval(() => {
      const res = this.tmux(['display-message', '-p', '-t', name, '#{pane_dead}|#{pane_dead_status}']);
      if (res.status !== 0) {
        // Session vanished entirely (killed out-of-band) — treat as a clean exit.
        fireExit(0);
        return;
      }
      const { dead, status } = parsePaneStatus(res.stdout?.toString() ?? '');
      if (dead) fireExit(status);
    }, POLL_INTERVAL_MS);
    timer.poll.unref?.();

    return {
      get pid() {
        return proc.pid;
      },
      write: (data) => proc.write(data),
      resize: (columns, r) => proc.resize(columns, r),
      onData: (listener) => proc.onData(listener),
      onExit: (listener) => {
        exitListeners.add(listener);
        return { dispose: () => exitListeners.delete(listener) } satisfies SpawnDisposable;
      },
      kill: () => fireExit(0),
      detach: () => {
        // Leave the tmux session running; only drop our local stream so a restart
        // can reattach (Phase 17 §C3).
        stopPoll();
        try {
          proc.kill();
        } catch {
          // already gone
        }
      },
    };
  }

  private tmux(args: string[]): ReturnType<typeof spawnSync> {
    return spawnSync('tmux', args, { encoding: 'buffer' });
  }

  private isAvailable(): boolean {
    if (this.available !== null) return this.available;
    const res = spawnSync('tmux', ['-V'], { encoding: 'buffer' });
    this.available = !res.error && res.status === 0;
    if (!this.available) {
      this.logger.error('tmux binary unavailable — terminal.mode "tmux" cannot spawn sessions');
    }
    return this.available;
  }

  private ensureAvailable(): void {
    if (!this.isAvailable()) {
      throw new TmuxUnavailableError(
        'tmux not found on PATH (terminal.mode is "tmux"); install tmux or switch terminal.mode to "pty"',
      );
    }
  }

  private loadPty(): NodePtyModule {
    if (this.nodePty) return this.nodePty;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.nodePty = require('node-pty') as NodePtyModule;
      return this.nodePty;
    } catch (err) {
      throw new TmuxUnavailableError(
        `node-pty failed to load (needed for the tmux attach stream): ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
