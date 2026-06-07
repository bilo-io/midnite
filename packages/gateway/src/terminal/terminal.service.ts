import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MidniteConfig, ServerTerminalMessage } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { TasksService } from '../tasks/tasks.service';

type NodePtyModule = typeof import('node-pty');
type IPty = import('node-pty').IPty;
type IDisposable = import('node-pty').IDisposable;

/** A sink for server→client terminal messages. The WS gateway implements this. */
export interface TerminalSubscriber {
  send(message: ServerTerminalMessage): void;
}

/**
 * Drop the oldest frames until the buffered byte total fits within `limit`,
 * always keeping at least one frame (so a single oversized chunk survives).
 * Returns the new byte total. Pure — exported for testing.
 */
export function trimRingByBytes(
  ring: Array<{ bytes: number }>,
  totalBytes: number,
  limit: number,
): number {
  let total = totalBytes;
  while (total > limit && ring.length > 1) {
    const dropped = ring.shift();
    if (dropped) total -= dropped.bytes;
  }
  return total;
}

export interface TerminalGeometry {
  cols: number;
  rows: number;
}

interface OutputFrame {
  seq: number;
  data: string; // base64
  bytes: number; // decoded byte length, for ring accounting
}

interface PtyHandle {
  proc: IPty;
  subscribers: Set<TerminalSubscriber>;
  ring: OutputFrame[];
  ringBytes: number;
  seq: number;
  disposeTimer: NodeJS.Timeout | null;
  disposables: IDisposable[];
}

const TOKEN_TTL_MS = 60_000;

/**
 * Owns the live PTYs behind session windows: spawn-on-demand, reattach with
 * scrollback replay, bounded ring buffer, idle reaping, and shutdown cleanup.
 * Speaks only the {@link TerminalSubscriber} interface so it stays decoupled
 * from the WebSocket transport.
 */
@Injectable()
export class TerminalService implements OnModuleDestroy {
  private readonly logger = new Logger(TerminalService.name);
  private readonly handles = new Map<string, PtyHandle>();
  private readonly tokens = new Map<string, { token: string; expiresAt: number }>();
  private nodePty: NodePtyModule | null = null;
  private ptyLoadFailed = false;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  // ---- token auth (single-use, short-lived) ----

  mintToken(sessionId: string): string {
    const token = randomUUID();
    this.tokens.set(sessionId, { token, expiresAt: Date.now() + TOKEN_TTL_MS });
    return token;
  }

  verifyToken(sessionId: string, token: string): boolean {
    const entry = this.tokens.get(sessionId);
    if (!entry) return false;
    this.tokens.delete(sessionId); // single-use regardless of outcome
    if (entry.token !== token) return false;
    return Date.now() <= entry.expiresAt;
  }

  // ---- lifecycle ----

  /** Attach a subscriber to the session's PTY, spawning one on demand. */
  attach(sessionId: string, subscriber: TerminalSubscriber, geom: TerminalGeometry): void {
    const existing = this.handles.get(sessionId);
    if (existing) {
      if (existing.disposeTimer) {
        clearTimeout(existing.disposeTimer);
        existing.disposeTimer = null;
      }
      existing.subscribers.add(subscriber);
      subscriber.send({ type: 'status', phase: 'reattached', pid: existing.proc.pid });
      for (const frame of existing.ring) {
        subscriber.send({ type: 'output', data: frame.data, seq: frame.seq });
      }
      return;
    }

    const pty = this.loadPty();
    if (!pty) {
      subscriber.send({
        type: 'error',
        code: 'spawn-failed',
        message: 'terminal backend unavailable',
      });
      return;
    }

    subscriber.send({ type: 'status', phase: 'spawning' });
    let handle: PtyHandle;
    try {
      handle = this.spawn(pty, sessionId, geom);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'spawn failed';
      this.logger.error(`pty spawn failed for session ${sessionId}: ${message}`);
      subscriber.send({ type: 'error', code: 'spawn-failed', message });
      return;
    }
    handle.subscribers.add(subscriber);
    subscriber.send({ type: 'status', phase: 'ready', pid: handle.proc.pid });
  }

  /** Detach a subscriber; the PTY is reaped after an idle grace period. */
  detach(sessionId: string, subscriber: TerminalSubscriber): void {
    const handle = this.handles.get(sessionId);
    if (!handle) return;
    handle.subscribers.delete(subscriber);
    if (handle.subscribers.size > 0) return;

    const idleMs = this.config.terminal.idleDisposeMs;
    if (idleMs <= 0) {
      this.kill(sessionId);
      return;
    }
    handle.disposeTimer = setTimeout(() => this.kill(sessionId), idleMs);
    handle.disposeTimer.unref?.();
  }

  write(sessionId: string, base64: string): void {
    const handle = this.handles.get(sessionId);
    if (!handle) return;
    handle.proc.write(Buffer.from(base64, 'base64').toString('utf8'));
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const handle = this.handles.get(sessionId);
    if (!handle) return;
    try {
      handle.proc.resize(cols, rows);
    } catch (err) {
      this.logger.warn(
        `resize failed for session ${sessionId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  has(sessionId: string): boolean {
    return this.handles.has(sessionId);
  }

  onModuleDestroy(): void {
    for (const sessionId of [...this.handles.keys()]) this.kill(sessionId);
  }

  // ---- internals ----

  private spawn(pty: NodePtyModule, sessionId: string, geom: TerminalGeometry): PtyHandle {
    const spec = this.resolveSpawnSpec(sessionId);
    const proc = pty.spawn(spec.command, spec.args, {
      name: 'xterm-256color',
      cols: geom.cols,
      rows: geom.rows,
      cwd: spec.cwd,
      env: spec.env,
    });

    const handle: PtyHandle = {
      proc,
      subscribers: new Set(),
      ring: [],
      ringBytes: 0,
      seq: 0,
      disposeTimer: null,
      disposables: [],
    };
    this.handles.set(sessionId, handle);

    handle.disposables.push(
      proc.onData((chunk) => {
        const frame: OutputFrame = {
          seq: handle.seq++,
          data: Buffer.from(chunk, 'utf8').toString('base64'),
          bytes: Buffer.byteLength(chunk, 'utf8'),
        };
        this.pushRing(handle, frame);
        this.broadcast(handle, { type: 'output', data: frame.data, seq: frame.seq });
      }),
    );
    handle.disposables.push(
      proc.onExit(({ exitCode, signal }) => {
        this.broadcast(handle, {
          type: 'status',
          phase: 'exited',
          exitCode,
          signal: signal ?? null,
        });
        this.cleanup(sessionId);
      }),
    );

    this.logger.log(
      `spawned pty for session ${sessionId}: ${spec.command} (pid ${proc.pid}) in ${spec.cwd}`,
    );
    return handle;
  }

  private resolveSpawnSpec(sessionId: string): {
    command: string;
    args: string[];
    cwd: string;
    env: Record<string, string>;
  } {
    const { terminal } = this.config;
    const command = terminal.command ?? process.env['SHELL'] ?? '/bin/bash';
    // A bare default shell needs `-i` to be interactive; a configured command
    // takes its args verbatim.
    const args =
      terminal.command === undefined && terminal.args.length === 0 ? ['-i'] : terminal.args;

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    env['TERM'] = 'xterm-256color';

    return { command, args, cwd: this.resolveCwd(sessionId), env };
  }

  // cwd follows the session's task repo (mapped name→path via config.repos),
  // falling back to the gateway's working directory.
  private resolveCwd(sessionId?: string): string {
    if (sessionId) {
      const task = this.tasks.listTasks().find((t) => t.id === sessionId);
      const repo = task?.repo
        ? this.config.repos.find((r) => r.name === task.repo)
        : undefined;
      if (repo) return repo.path;
    }
    return process.cwd();
  }

  private pushRing(handle: PtyHandle, frame: OutputFrame): void {
    handle.ring.push(frame);
    handle.ringBytes = trimRingByBytes(
      handle.ring,
      handle.ringBytes + frame.bytes,
      this.config.terminal.scrollbackBytes,
    );
  }

  private broadcast(handle: PtyHandle, message: ServerTerminalMessage): void {
    for (const subscriber of handle.subscribers) {
      try {
        subscriber.send(message);
      } catch (err) {
        this.logger.warn(
          `subscriber send failed: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }
  }

  private kill(sessionId: string): void {
    const handle = this.handles.get(sessionId);
    if (!handle) return;
    try {
      handle.proc.kill();
    } catch {
      // already dead
    }
    this.cleanup(sessionId);
  }

  private cleanup(sessionId: string): void {
    const handle = this.handles.get(sessionId);
    if (!handle) return;
    if (handle.disposeTimer) {
      clearTimeout(handle.disposeTimer);
      handle.disposeTimer = null;
    }
    for (const d of handle.disposables) {
      try {
        d.dispose();
      } catch {
        // ignore
      }
    }
    this.handles.delete(sessionId);
  }

  // Loaded lazily and fail-soft: a broken node-pty native build disables live
  // terminals but must not take down the REST gateway.
  private loadPty(): NodePtyModule | null {
    if (this.nodePty) return this.nodePty;
    if (this.ptyLoadFailed) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.nodePty = require('node-pty') as NodePtyModule;
      return this.nodePty;
    } catch (err) {
      this.ptyLoadFailed = true;
      this.logger.error(
        `node-pty failed to load — live terminals disabled: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return null;
    }
  }
}
