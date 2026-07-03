import { Injectable, Logger } from '@nestjs/common';
import type { Spawner, SpawnSpec, SpawnHandle } from './spawner';

type NodePtyModule = typeof import('node-pty');

/** Thrown when node-pty can't be loaded — surfaced to the caller, never a silent fallback. */
export class SpawnUnavailableError extends Error {}

/** Whether a pid names a live process. `kill(pid, 0)` sends no signal — it only
 *  probes existence/permission; ESRCH means gone. Exported for the watchdog. */
export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM = alive but not ours (still alive); ESRCH = no such process.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

@Injectable()
export class PtySpawner implements Spawner {
  private readonly logger = new Logger(PtySpawner.name);
  private nodePty: NodePtyModule | null = null;
  private loadFailed = false;
  // PTYs die with the gateway process: nothing to rediscover or reattach, so
  // shutdown kills and boot finds no live sessions (the default reconcile path).
  readonly durable = false;

  // sessionId → live pid, for the Phase 54 C watchdog's liveness probe. Recorded
  // on spawn (when a sessionId is given) and pruned on the handle's exit.
  private readonly pids = new Map<string, number>();

  spawn(spec: SpawnSpec): SpawnHandle {
    const pty = this.load();
    if (!pty) throw new SpawnUnavailableError('terminal backend unavailable');
    // IPty structurally satisfies SpawnHandle.
    const handle = pty.spawn(spec.command, spec.args, {
      name: 'xterm-256color',
      cols: spec.cols ?? 120,
      rows: spec.rows ?? 32,
      cwd: spec.cwd,
      env: spec.env,
    });
    if (spec.sessionId) {
      const id = spec.sessionId;
      this.pids.set(id, handle.pid);
      handle.onExit(() => this.pids.delete(id));
    }
    return handle;
  }

  /** Phase 54 C: is the tracked pty for `sessionId` still alive? `undefined` when
   *  we never tracked it (unknown → treated as alive by the caller). */
  isSessionAlive(sessionId: string): boolean | undefined {
    const pid = this.pids.get(sessionId);
    if (pid === undefined) return undefined;
    return isPidAlive(pid);
  }

  // Loaded lazily and fail-soft: a broken node-pty native build disables live
  // terminals but must not take down the REST gateway.
  private load(): NodePtyModule | null {
    if (this.nodePty) return this.nodePty;
    if (this.loadFailed) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.nodePty = require('node-pty') as NodePtyModule;
      return this.nodePty;
    } catch (err) {
      this.loadFailed = true;
      this.logger.error(
        `node-pty failed to load — live terminals disabled: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return null;
    }
  }
}
