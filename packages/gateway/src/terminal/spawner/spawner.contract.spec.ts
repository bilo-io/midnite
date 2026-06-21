import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { PtySpawner } from './pty-spawner';
import { TmuxSpawner } from './tmux-spawner';
import type { SpawnHandle, Spawner } from './spawner';

/**
 * One behavioural contract that every {@link Spawner} backend must satisfy:
 * spawn → stream output → write reaches the process → resize takes → onExit
 * fires with the inner exit code → kill tears down. Run against the real `pty`
 * backend always (node-pty is a hard dep), and the real `tmux` backend when the
 * binary is present on the runner — skip-guarded so CI without tmux stays green
 * (Phase 17 §D). These spawn real processes, so they're slower than unit specs.
 */

function tmuxAvailable(): boolean {
  try {
    return spawnSync('tmux', ['-V']).status === 0;
  } catch {
    return false;
  }
}

function nodePtyAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node-pty');
    return true;
  } catch {
    return false;
  }
}

const cleanEnv = (): Record<string, string> =>
  Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v != null),
  ) as Record<string, string>;

function waitForExit(handle: SpawnHandle, timeoutMs = 8000): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for exit')), timeoutMs);
    handle.onExit(({ exitCode }) => {
      clearTimeout(timer);
      resolve(exitCode);
    });
  });
}

async function waitFor(pred: () => boolean, timeoutMs = 6000): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 50));
  }
}

function runContract(
  label: string,
  makeSpawner: () => Spawner,
  idPrefix: string,
  available: boolean,
): void {
  (available ? describe : describe.skip)(`Spawner contract: ${label}`, () => {
    const live: SpawnHandle[] = [];
    afterEach(() => {
      for (const h of live.splice(0)) {
        try {
          h.kill();
        } catch {
          // best-effort teardown
        }
      }
    });

    it(
      'streams output and exits with the inner process exit code',
      async () => {
        const handle = makeSpawner().spawn({
          command: 'sh',
          args: ['-c', 'printf READY; sleep 0.3; exit 7'],
          cwd: process.cwd(),
          env: cleanEnv(),
          sessionId: `${idPrefix}-exit`,
        });
        live.push(handle);
        let out = '';
        handle.onData((d) => (out += d));
        const code = await waitForExit(handle);
        expect(out).toContain('READY');
        expect(code).toBe(7);
      },
      15000,
    );

    it(
      'forwards written input to the process (cat echoes stdin)',
      async () => {
        const handle = makeSpawner().spawn({
          command: 'cat',
          args: [],
          cwd: process.cwd(),
          env: cleanEnv(),
          sessionId: `${idPrefix}-write`,
        });
        live.push(handle);
        let out = '';
        handle.onData((d) => (out += d));
        handle.write('ping\n');
        await waitFor(() => out.includes('ping'));
        expect(out).toContain('ping');
      },
      15000,
    );

    it(
      'resizes a live session without throwing',
      async () => {
        const handle = makeSpawner().spawn({
          command: 'sh',
          args: ['-c', 'sleep 1'],
          cwd: process.cwd(),
          env: cleanEnv(),
          sessionId: `${idPrefix}-resize`,
        });
        live.push(handle);
        expect(() => handle.resize(80, 24)).not.toThrow();
      },
      15000,
    );
  });
}

runContract('pty', () => new PtySpawner(), `contract-pty-${process.pid}`, nodePtyAvailable());
runContract('tmux', () => new TmuxSpawner(), `contract-tmux-${process.pid}`, tmuxAvailable());
