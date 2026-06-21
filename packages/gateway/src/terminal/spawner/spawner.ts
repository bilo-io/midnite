/** A disposable subscription (mirrors node-pty's IDisposable). */
export interface SpawnDisposable {
  dispose(): void;
}

/** What to launch. `env` is fully resolved by the caller (TerminalService.fullEnv()). */
export type SpawnSpec = {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  cols?: number;
  rows?: number;
};

/**
 * A live process handle. Deliberately mirrors node-pty's `IPty` surface so the
 * pty backend is a thin pass-through and TerminalService's existing call sites
 * (proc.onData/onExit/write/resize/kill/pid) are unchanged.
 */
export interface SpawnHandle {
  readonly pid: number;
  write(data: string): void;
  resize(columns: number, rows: number): void;
  onData(listener: (data: string) => void): SpawnDisposable;
  onExit(listener: (e: { exitCode: number; signal?: number }) => void): SpawnDisposable;
  kill(signal?: string): void;
}

/** Spawns processes for terminal sessions. The backend is selected by config. */
export interface Spawner {
  spawn(spec: SpawnSpec): SpawnHandle;
}

/** Nest DI token for the configured Spawner. */
export const SPAWNER = Symbol('Spawner');
