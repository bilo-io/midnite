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
  /**
   * The terminal session id this process backs (task id for agent runs, attach
   * id for councils/ad-hoc). The `pty` backend ignores it; the `tmux` backend
   * uses it to name the durable session deterministically (`midnite-<sessionId>`)
   * so a gateway restart can rediscover and reattach (Phase 17 §6).
   */
  sessionId?: string;
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
  /**
   * Stop streaming this handle **without ending the underlying process** —
   * durable backends only. For `tmux` this kills the local attach client but
   * leaves the detached session running, so a restart can reattach (Phase 17
   * §C3). Undefined for `pty` (a PTY can't outlive its process), where shutdown
   * always kills.
   */
  detach?(): void;
}

/**
 * Spawns processes for terminal sessions. The backend is selected by
 * `terminal.mode`. The optional members are implemented only by *durable*
 * backends (tmux): a `pty` process dies with the gateway, so it has nothing to
 * rediscover or reattach.
 */
export interface Spawner {
  spawn(spec: SpawnSpec): SpawnHandle;
  /**
   * Whether sessions survive the gateway process. When true the gateway
   * detaches (not kills) on shutdown and rediscovers sessions on boot.
   */
  readonly durable?: boolean;
  /**
   * Session ids (already stripped of the backend's naming prefix) whose
   * durable session is still alive — the boot-time rediscovery set. `pty`
   * returns nothing.
   */
  listSessions?(): string[];
  /**
   * Reattach a fresh stream to an already-running durable session. Returns null
   * if no such session is live. `pty` cannot reattach across a restart.
   */
  reattach?(spec: { sessionId: string; cols?: number; rows?: number }): SpawnHandle | null;
  /**
   * Tear down a durable session by id without a registered handle — used to
   * reap a session whose owning task is gone/finished after a restart.
   */
  killSession?(sessionId: string): void;
  /**
   * Whether the process backing `sessionId` is still alive (Phase 54 C watchdog).
   * `pty` tracks its spawned handles and checks the pid; `tmux` checks the pane is
   * not dead. Returns `undefined` when the backend can't tell (no tracked session)
   * — the caller treats "don't know" as alive (fail-open, never a false kill).
   */
  isSessionAlive?(sessionId: string): boolean | undefined;
}

/** Nest DI token for the configured Spawner. */
export const SPAWNER = Symbol('Spawner');
