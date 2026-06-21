import { Injectable, Logger } from '@nestjs/common';
import type { Spawner, SpawnSpec, SpawnHandle } from './spawner';

type NodePtyModule = typeof import('node-pty');

/** Thrown when node-pty can't be loaded — surfaced to the caller, never a silent fallback. */
export class SpawnUnavailableError extends Error {}

@Injectable()
export class PtySpawner implements Spawner {
  private readonly logger = new Logger(PtySpawner.name);
  private nodePty: NodePtyModule | null = null;
  private loadFailed = false;

  spawn(spec: SpawnSpec): SpawnHandle {
    const pty = this.load();
    if (!pty) throw new SpawnUnavailableError('terminal backend unavailable');
    // IPty structurally satisfies SpawnHandle.
    return pty.spawn(spec.command, spec.args, {
      name: 'xterm-256color',
      cols: spec.cols ?? 120,
      rows: spec.rows ?? 32,
      cwd: spec.cwd,
      env: spec.env,
    });
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
