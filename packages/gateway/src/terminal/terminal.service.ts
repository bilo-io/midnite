import { Inject, Injectable, Logger, forwardRef, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { AGENT_CLI_COMMAND, type MidniteConfig, type ServerTerminalMessage } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { AgentsService } from '../agents/agents.service';
import { expandTilde } from '../fs/path-tilde';
import { ProjectsService } from '../projects/projects.service';
import { ReposService } from '../repos/repos.service';
import { TasksService } from '../tasks/tasks.service';
import { ApprovalService } from './approval.service';
import { pickSessionCwd } from './lib/resolve-cwd';
import { PtySpawner } from './spawner/pty-spawner';
import {
  SPAWNER,
  type Spawner,
  type SpawnHandle,
  type SpawnDisposable,
} from './spawner/spawner';

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

// Keys that look like credentials — stripped from a shell PTY's env so an
// interactive terminal doesn't inherit the gateway's secrets. Pure/exported for testing.
const SECRET_ENV_PATTERN = /(SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|API_KEY|ACCESS_KEY|PRIVATE_KEY)/i;

export function scrubSecretEnv(env: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!SECRET_ENV_PATTERN.test(key)) out[key] = value;
  }
  return out;
}

/** Single-quote a path for safe interpolation into a shell command line. */
function shellQuote(path: string): string {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

/**
 * The first line fed to a freshly-spawned session shell: change into the
 * project's working directory, clear the startup noise, and — on first open —
 * launch the preferred agent CLI, so the terminal opens on the agent rooted at
 * the project. Pure/exported for testing.
 *
 * `launchCommand` is the agent CLI to run (e.g. `claude`); omit it to land on a
 * bare prompt. Runs only on spawn, so a reattach to a live PTY never re-launches.
 *
 * Only applies to the default interactive shell — a configured command (e.g.
 * `claude`, or a one-shot script) drives its own stdin and must not be typed at.
 */
export function buildShellInitCommand(
  configuredCommand: string | undefined,
  cwd: string,
  launchCommand?: string,
): string | undefined {
  if (configuredCommand !== undefined) return undefined;
  const launch = launchCommand?.trim() ? ` && ${launchCommand.trim()}` : '';
  return `cd ${shellQuote(cwd)} && clear${launch}\r`;
}

/**
 * The init line for an ad-hoc install terminal: clear the startup noise, then
 * type the install chain at the prompt **without** a trailing `\r`, so it sits
 * there and the user presses Enter to run it. Pure/exported for testing.
 */
export function buildInstallInitCommand(chain: string): string {
  return `clear\r${chain}`;
}

/**
 * Resolve the runtime path to a hook script (`pre-tool-use-hook.cjs`,
 * `stop-hook.cjs`, `notification-hook.cjs`). `tsc -b` doesn't copy non-.ts assets
 * into dist, so the scripts live in src and we walk candidates the same way
 * db.module.ts finds migrations (dev: __dirname=src/terminal; prod: dist/terminal,
 * where the gateway:build step copies them — see moon.yml).
 */
export function resolveHookScriptPath(filename: string): string {
  const rel = `hooks/${filename}`;
  const candidates = [
    resolve(__dirname, rel), // dev: src/terminal/hooks/...
    resolve(__dirname, '../../src/terminal', rel), // dist/terminal -> package src
    resolve(process.cwd(), 'packages/gateway/src/terminal', rel), // repo root
    resolve(process.cwd(), 'src/terminal', rel), // package dir
  ];
  return candidates.find((c) => existsSync(c)) ?? candidates[0]!;
}

interface OutputFrame {
  seq: number;
  data: string; // base64
  bytes: number; // decoded byte length, for ring accounting
}

interface PtyHandle {
  proc: SpawnHandle;
  command: string;
  subscribers: Set<TerminalSubscriber>;
  ring: OutputFrame[];
  ringBytes: number;
  seq: number;
  disposeTimer: NodeJS.Timeout | null;
  disposables: SpawnDisposable[];
  /** Ephemeral Claude `--settings` file for approvals; deleted on reap. */
  settingsFile: string | null;
  /** Pinned PTYs (managed one-shot runs) survive subscriber detach — they live
   *  until the process exits or the owner kills them. */
  pinned: boolean;
}

const TOKEN_TTL_MS = 60_000;

// Grace between a Ctrl+C interrupt and the hard PTY kill on a graceful stop, so
// the agent has a beat to abort its current turn before the process is reaped.
const INTERRUPT_GRACE_MS = 250;

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
  // Standalone (non-session) terminals — e.g. CLI installs. Keyed by a synthetic
  // id; the value is the init command pasted into the spawned shell.
  private readonly adHoc = new Map<string, { initCommand: string }>();

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(ReposService) private readonly repos: ReposService,
    @Inject(AgentsService) private readonly agents: AgentsService,
    // Mutual lifecycle/broadcast dependency within the terminal module.
    @Inject(forwardRef(() => ApprovalService)) private readonly approvals: ApprovalService,
    // The process backend, selected by config in the module factory. Defaults to a
    // real PtySpawner so direct construction (tests, the in-process serve path)
    // spawns live PTYs without DI; Nest always injects the configured SPAWNER.
    @Inject(SPAWNER) private readonly spawner: Spawner = new PtySpawner(),
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

  // ---- ad-hoc (non-session) terminals ----

  /**
   * Register a standalone terminal that, when attached to, spawns a plain shell
   * and pastes `initCommand`. Returns its synthetic id; the caller mints a token
   * for it via the normal terminal-token flow and attaches over WS.
   */
  createAdHocTerminal(initCommand: string): string {
    const id = `adhoc-${randomUUID()}`;
    this.adHoc.set(id, { initCommand });
    return id;
  }

  hasAdHoc(id: string): boolean {
    return this.adHoc.has(id);
  }

  // ---- managed runs (eager one-shot PTYs, e.g. council participants) ----

  /**
   * Eagerly spawn a one-shot command in a PTY registered under `attachId`, so
   * viewers can watch it through the normal token + attach flow while the owner
   * captures output and observes exit via `hooks`. Unlike session PTYs the
   * handle is *pinned*: it is never idle-reaped on detach and lives until the
   * process exits (or {@link killManagedRun}).
   *
   * The env is inherited **unscrubbed** — agent CLIs need their own credentials
   * (same rationale as the `inheritSecrets` opt-in for `command: "claude"`);
   * the process is non-interactive, so exposure is far lower than a shell.
   *
   * `hooks.onExit` fires before the handle is cleaned up; `hooks.onData` sees
   * every raw chunk (ANSI included) in arrival order.
   */
  spawnManagedRun(
    attachId: string,
    spec: { command: string; args: string[]; cwd: string },
    hooks: {
      onData: (chunk: string) => void;
      onExit: (exitCode: number, signal: number | null) => void;
    },
  ): { ok: true; pid: number } | { ok: false; error: string } {
    if (this.handles.has(attachId)) {
      return { ok: false, error: `terminal ${attachId} already exists` };
    }
    if (this.handles.size >= this.config.terminal.maxSessions) {
      return {
        ok: false,
        error: `terminal session limit reached (${this.config.terminal.maxSessions})`,
      };
    }
    let proc: SpawnHandle;
    try {
      proc = this.spawner.spawn({
        command: spec.command,
        args: spec.args,
        cwd: spec.cwd,
        env: this.fullEnv(),
        sessionId: attachId,
      });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'spawn failed' };
    }

    const handle: PtyHandle = {
      proc,
      command: spec.command,
      subscribers: new Set(),
      ring: [],
      ringBytes: 0,
      seq: 0,
      disposeTimer: null,
      disposables: [],
      settingsFile: null,
      pinned: true,
    };
    this.handles.set(attachId, handle);

    handle.disposables.push(
      proc.onData((chunk) => {
        const frame: OutputFrame = {
          seq: handle.seq++,
          data: Buffer.from(chunk, 'utf8').toString('base64'),
          bytes: Buffer.byteLength(chunk, 'utf8'),
        };
        this.pushRing(handle, frame);
        this.broadcast(handle, { type: 'output', data: frame.data, seq: frame.seq });
        hooks.onData(chunk);
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
        // Owner hook fires before teardown so it can read a consistent handle state.
        hooks.onExit(exitCode, signal ?? null);
        this.cleanup(attachId);
      }),
    );

    this.logger.log(
      `spawned managed run ${attachId}: ${spec.command} (pid ${proc.pid}) in ${spec.cwd}`,
    );
    return { ok: true, pid: proc.pid };
  }

  /**
   * Spawn an autonomous agent session for a task, seeded with its prompt. Like a
   * managed run the handle is *pinned* (survives detach, lives until the process
   * exits or {@link killManagedRun}), but it launches the preferred agent CLI
   * with full approval/hook wiring so a human can attach via the normal token +
   * attach flow and take over. `sessionId` is the task id.
   *
   * The prompt is passed as the CLI's positional arg (e.g. `claude "<prompt>"`),
   * which seeds interactive mode and submits immediately — no fragile stdin
   * timing — then the session stays open so the Stop hook fires and a viewer can
   * intervene. node-pty spawns without a shell, so the prompt needs no quoting.
   */
  spawnAgentSession(
    sessionId: string,
    spec: { prompt: string },
    hooks: { onExit: (exitCode: number, signal: number | null) => void },
  ): { ok: true; pid: number } | { ok: false; error: string } {
    if (this.handles.has(sessionId)) {
      return { ok: false, error: `terminal ${sessionId} already exists` };
    }
    if (this.handles.size >= this.config.terminal.maxSessions) {
      return {
        ok: false,
        error: `terminal session limit reached (${this.config.terminal.maxSessions})`,
      };
    }
    const command = AGENT_CLI_COMMAND[this.agents.getAgentCli()];
    const args: string[] = [];
    const env = this.fullEnv();
    const settingsFile = this.applyHookWiring(sessionId, command, args, env, { lifecycle: true });
    args.push(spec.prompt);

    const cwd = this.resolveCwd(sessionId);
    let proc: SpawnHandle;
    try {
      proc = this.spawner.spawn({ command, args, cwd, env, sessionId });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'spawn failed' };
    }

    const handle = this.registerAgentHandle(sessionId, proc, command, settingsFile ?? null, hooks);
    this.logger.log(`spawned agent session ${sessionId}: ${command} (pid ${proc.pid}) in ${cwd}`);
    return { ok: true, pid: handle.proc.pid };
  }

  /**
   * Reattach to an autonomous agent session that survived a gateway restart
   * (durable `tmux` backend only). Unlike {@link spawnAgentSession} this starts
   * no new process — it asks the spawner for a fresh stream onto the existing
   * `midnite-<sessionId>` session and re-registers the pinned handle with the
   * same onExit wiring, so the run picks up where it left off instead of being
   * orphaned/requeued (Phase 17 §C2). Returns `ok: false` when the backend can't
   * reattach (pty mode) or the session is no longer live.
   */
  reattachAgentSession(
    sessionId: string,
    hooks: { onExit: (exitCode: number, signal: number | null) => void },
  ): { ok: true; pid: number } | { ok: false; error: string } {
    if (this.handles.has(sessionId)) {
      return { ok: false, error: `terminal ${sessionId} already exists` };
    }
    const proc = this.spawner.reattach?.({ sessionId });
    if (!proc) return { ok: false, error: 'no live session to reattach' };
    // The running session already carries its --settings/hook wiring from the
    // original spawn; we don't own that file on reattach, so don't track it for
    // unlink. The display command is the configured agent CLI.
    const command = AGENT_CLI_COMMAND[this.agents.getAgentCli()];
    const handle = this.registerAgentHandle(sessionId, proc, command, null, hooks);
    this.logger.log(`reattached agent session ${sessionId}: ${command} (pid ${proc.pid})`);
    return { ok: true, pid: handle.proc.pid };
  }

  /** Live durable-session ids (tmux) that survived a restart — empty for pty.
   *  The boot-time rediscovery set consumed by the pool's recovery. */
  liveSessionIds(): string[] {
    return this.spawner.listSessions?.() ?? [];
  }

  /** Tear down a durable session with no owning task (stray after a restart). */
  discardSession(sessionId: string): void {
    this.spawner.killSession?.(sessionId);
  }

  /** Whether the configured backend's sessions survive the gateway process. */
  isDurable(): boolean {
    return this.spawner.durable === true;
  }

  /**
   * Register a *pinned* handle (agent session) with the standard onData/onExit
   * streaming wiring. Shared by spawn and reattach so both behave identically
   * once the stream is live.
   */
  private registerAgentHandle(
    sessionId: string,
    proc: SpawnHandle,
    command: string,
    settingsFile: string | null,
    hooks: { onExit: (exitCode: number, signal: number | null) => void },
  ): PtyHandle {
    const handle: PtyHandle = {
      proc,
      command,
      subscribers: new Set(),
      ring: [],
      ringBytes: 0,
      seq: 0,
      disposeTimer: null,
      disposables: [],
      settingsFile,
      pinned: true,
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
        hooks.onExit(exitCode, signal ?? null);
        this.cleanup(sessionId);
      }),
    );
    return handle;
  }

  /** Read the decoded scrollback for a session (managed/agent runs). Used to
   *  scrape a PR URL from an agent's output on the Stop hook. */
  readOutput(sessionId: string): string {
    const handle = this.handles.get(sessionId);
    if (!handle) return '';
    return handle.ring
      .map((frame) => Buffer.from(frame.data, 'base64').toString('utf8'))
      .join('');
  }

  /**
   * Kill a managed run's PTY (timeout/cancel path). Unlike the private `kill()`
   * this does NOT clean up synchronously — that would dispose the onExit
   * listener before node-pty delivers the exit event. The signal lands, onExit
   * fires the owner hook, and the exit path runs cleanup.
   */
  killManagedRun(attachId: string): void {
    const handle = this.handles.get(attachId);
    if (!handle) return;
    try {
      handle.proc.kill();
    } catch {
      // already dead — onExit either fired or is in flight
    }
  }

  /**
   * Gracefully stop a managed run/agent session: send Ctrl+C (SIGINT to the
   * foreground agent so it can abort the current turn cleanly), then hard-kill the
   * PTY after a short grace so the slot always frees even if the interrupt is
   * ignored. Reaping rides {@link killManagedRun}'s onExit path, same as a kill.
   */
  interruptManagedRun(attachId: string): void {
    const handle = this.handles.get(attachId);
    if (!handle) return;
    try {
      handle.proc.write('\x03'); // Ctrl+C
    } catch {
      // already dead — fall through to the kill, which no-ops on a dead handle
    }
    const timer = setTimeout(() => this.killManagedRun(attachId), INTERRUPT_GRACE_MS);
    timer.unref?.();
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
      subscriber.send({
        type: 'status',
        phase: 'reattached',
        pid: existing.proc.pid,
        command: existing.command,
      });
      for (const frame of existing.ring) {
        subscriber.send({ type: 'output', data: frame.data, seq: frame.seq });
      }
      // Re-surface any approval prompt still pending, so a reconnecting viewer
      // doesn't lose the overlay.
      this.approvals.replayPending(sessionId, subscriber);
      return;
    }

    if (this.handles.size >= this.config.terminal.maxSessions) {
      subscriber.send({
        type: 'error',
        code: 'limit',
        message: `terminal session limit reached (${this.config.terminal.maxSessions})`,
      });
      return;
    }

    // Managed-run ids (council debates) are spawned eagerly by their owner; an
    // attach that finds no live handle means the run already exited — never
    // fall through and spawn a stray interactive shell under that id.
    if (sessionId.startsWith('council-')) {
      subscriber.send({
        type: 'error',
        code: 'session-not-found',
        message: 'run terminal is no longer live',
      });
      return;
    }

    subscriber.send({ type: 'status', phase: 'spawning' });
    let handle: PtyHandle;
    try {
      handle = this.spawn(sessionId, geom);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'spawn failed';
      this.logger.error(`pty spawn failed for session ${sessionId}: ${message}`);
      subscriber.send({ type: 'error', code: 'spawn-failed', message });
      return;
    }
    handle.subscribers.add(subscriber);
    subscriber.send({
      type: 'status',
      phase: 'ready',
      pid: handle.proc.pid,
      command: handle.command,
    });
  }

  /** Detach a subscriber; the PTY is reaped after an idle grace period. */
  detach(sessionId: string, subscriber: TerminalSubscriber): void {
    const handle = this.handles.get(sessionId);
    if (!handle) return;
    handle.subscribers.delete(subscriber);
    if (handle.subscribers.size > 0) return;
    // A pinned (managed-run) PTY is not idle-reaped: it runs to process exit
    // whether or not anyone is watching.
    if (handle.pinned) return;

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
    // Durable backend (tmux): leave the sessions running so a restart can
    // reattach (Phase 17 §C3) — only drop our local streams/timers here. The
    // pty backend can't outlive the process, so its sessions are killed as
    // before. Explicit kill / idle-reap / graceful-stop still ends a durable
    // session; this path is shutdown only.
    if (this.isDurable()) {
      for (const sessionId of [...this.handles.keys()]) this.detachOnShutdown(sessionId);
      return;
    }
    for (const sessionId of [...this.handles.keys()]) this.kill(sessionId);
  }

  /** Shutdown teardown for a durable session: drop the local stream + timers and
   *  forget the handle, but leave the tmux session (and its --settings file)
   *  intact so boot-time reattach can resume it. */
  private detachOnShutdown(sessionId: string): void {
    const handle = this.handles.get(sessionId);
    if (!handle) return;
    try {
      handle.proc.detach?.();
    } catch {
      // attach client already gone
    }
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

  // ---- internals ----

  private spawn(sessionId: string, geom: TerminalGeometry): PtyHandle {
    const spec = this.resolveSpawnSpec(sessionId);
    const proc = this.spawner.spawn({
      command: spec.command,
      args: spec.args,
      cwd: spec.cwd,
      env: spec.env,
      cols: geom.cols,
      rows: geom.rows,
      sessionId,
    });

    const handle: PtyHandle = {
      proc,
      command: spec.command,
      subscribers: new Set(),
      ring: [],
      ringBytes: 0,
      seq: 0,
      disposeTimer: null,
      disposables: [],
      settingsFile: spec.settingsFile ?? null,
      pinned: false,
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

    // Drop the shell into the project directory on a clean screen. Queued after
    // the data listener so `clear`'s output is captured for scrollback replay.
    if (spec.initCommand) proc.write(spec.initCommand);

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
    settingsFile?: string;
    initCommand?: string;
  } {
    const { terminal } = this.config;
    const command = terminal.command ?? process.env['SHELL'] ?? '/bin/bash';
    // A bare default shell needs `-i` to be interactive; a configured command
    // takes its args verbatim (copied so we can append `--settings`).
    const args =
      terminal.command === undefined && terminal.args.length === 0 ? ['-i'] : [...terminal.args];

    let env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    // Don't hand the gateway's API keys/tokens to an interactive shell unless
    // explicitly opted in (e.g. for `command: "claude"`, which needs them).
    if (!terminal.inheritSecrets) env = scrubSecretEnv(env);
    env['TERM'] = 'xterm-256color';

    // Ad-hoc terminals (CLI installs) are not tied to a session: spawn a plain
    // shell at the gateway cwd and paste their own init command — no agent launch,
    // no approval wiring.
    const adHoc = this.adHoc.get(sessionId);
    if (adHoc) {
      return { command, args, cwd: process.cwd(), env, initCommand: adHoc.initCommand };
    }

    // Wire human-in-the-loop approvals for Claude Code sessions only (no
    // lifecycle hooks — interactive sessions don't auto-transition the task).
    // The MIDNITE_* vars are injected AFTER scrubSecretEnv so the *_SECRET key
    // isn't stripped.
    const settingsFile = this.applyHookWiring(sessionId, command, args, env, { lifecycle: false });

    const cwd = this.resolveCwd(sessionId);
    // On first open of a session, drop into the project dir and launch the
    // preferred agent CLI. A reattach reuses the live PTY, so it won't re-run.
    const launchCommand = AGENT_CLI_COMMAND[this.agents.getAgentCli()];
    return {
      command,
      args,
      cwd,
      env,
      settingsFile,
      initCommand: buildShellInitCommand(terminal.command, cwd, launchCommand),
    };
  }

  /** A full copy of the gateway's env (unscrubbed) plus TERM. For agent CLIs and
   *  managed runs, which need their own credentials to function. */
  private fullEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    env['TERM'] = 'xterm-256color';
    return env;
  }

  /**
   * Register Claude's hooks for a `claude` session: write the ephemeral
   * `--settings` file, append it to `args`, and inject the per-session secret +
   * callback URL into `env`. Mutates `args`/`env`; returns the settings file path
   * to track for cleanup, or undefined when no hooks apply (non-claude command,
   * or nothing to register).
   *
   * - PreToolUse (tool approvals) is registered only when `terminal.approvals`
   *   is enabled — interactive and agent sessions alike.
   * - Stop/Notification (task lifecycle → status) are registered when
   *   `opts.lifecycle` is set, i.e. for autonomous agent sessions, regardless of
   *   the approvals flag — they drive task status, not tool gating.
   */
  private applyHookWiring(
    sessionId: string,
    command: string,
    args: string[],
    env: Record<string, string>,
    opts: { lifecycle: boolean },
  ): string | undefined {
    const { terminal } = this.config;
    if (basename(command) !== 'claude') return undefined;
    const preToolUse = terminal.approvals.enabled;
    if (!preToolUse && !opts.lifecycle) return undefined;
    const secret = this.approvals.mintSecret(sessionId);
    const settingsFile = this.writeHookSettings(sessionId, {
      preToolUse,
      lifecycle: opts.lifecycle,
    });
    args.push('--settings', settingsFile);
    env['MIDNITE_SESSION_ID'] = sessionId;
    env['MIDNITE_HOOK_SECRET'] = secret;
    env['MIDNITE_GATEWAY_URL'] = this.hookCallbackUrl();
    // Hook's own fetch deadline, a touch past the gateway's so the gateway's
    // decision (or fail-safe) lands first; the hook aborts to `ask` only if the
    // gateway is truly unreachable.
    env['MIDNITE_HOOK_TIMEOUT_MS'] = String(terminal.approvals.timeoutMs + 15000);
    return settingsFile;
  }

  /** Loopback URL the in-PTY hook script calls back on (config override, else gateway port). */
  private hookCallbackUrl(): string {
    return (
      this.config.terminal.hookCallbackUrl ?? `http://127.0.0.1:${this.config.gateway.port}`
    );
  }

  /**
   * Write the ephemeral Claude `--settings` file registering the requested hooks.
   * PreToolUse blocks on a viewer decision (so it carries Claude's hook timeout);
   * Stop/Notification are fire-and-forget status callbacks.
   */
  private writeHookSettings(
    sessionId: string,
    opts: { preToolUse: boolean; lifecycle: boolean },
  ): string {
    const dir = this.approvalsDir();
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${sessionId}.settings.json`);
    // Give Claude's own hook timeout headroom past the gateway's, so the gateway's
    // decision (or fail-safe) always wins the race.
    const timeoutSec = Math.ceil(this.config.terminal.approvals.timeoutMs / 1000) + 30;
    const hooks: Record<string, unknown> = {};
    if (opts.preToolUse) {
      hooks['PreToolUse'] = [
        {
          matcher: '*',
          hooks: [
            {
              type: 'command',
              command: `node "${resolveHookScriptPath('pre-tool-use-hook.cjs')}"`,
              timeout: timeoutSec,
            },
          ],
        },
      ];
    }
    if (opts.lifecycle) {
      hooks['Stop'] = [
        { hooks: [{ type: 'command', command: `node "${resolveHookScriptPath('stop-hook.cjs')}"` }] },
      ];
      hooks['Notification'] = [
        {
          matcher: '*',
          hooks: [
            { type: 'command', command: `node "${resolveHookScriptPath('notification-hook.cjs')}"` },
          ],
        },
      ];
    }
    writeFileSync(file, JSON.stringify({ hooks }, null, 2), 'utf8');
    return file;
  }

  // Gitignored gateway data dir (alongside the SQLite db), never the repo cwd.
  private approvalsDir(): string {
    const dbPath = this.config.gateway.dbPath;
    const base = isAbsolute(dbPath) ? dirname(dbPath) : resolve(process.cwd(), dirname(dbPath));
    return join(base, 'approvals');
  }

  /** Send a server message to every subscriber of a session's PTY (no-op if none). */
  broadcastToSession(sessionId: string, message: ServerTerminalMessage): void {
    const handle = this.handles.get(sessionId);
    if (handle) this.broadcast(handle, message);
  }

  subscriberCount(sessionId: string): number {
    return this.handles.get(sessionId)?.subscribers.size ?? 0;
  }

  // cwd resolution for a session's PTY, in priority order:
  //   1. the work directory configured on the session's project (expanded from ~)
  //   2. the session's task repo (resolved name→path via the repo registry)
  //   3. the global fallback working directory (set on the profile page)
  //   4. the gateway's working directory
  private resolveCwd(sessionId?: string): string {
    let projectWorkDir: string | undefined;
    let repoPath: string | undefined;
    if (sessionId) {
      const task = this.tasks.listTasks().find((t) => t.id === sessionId);
      if (task?.projectId) projectWorkDir = this.projects.workDirFor(task.projectId);
      if (task?.repo) repoPath = this.repos.findByName(task.repo)?.path;
    }
    const chosen = pickSessionCwd({
      projectWorkDir,
      repoPath,
      fallback: this.agents.getDefaultWorkDir(),
      gatewayCwd: process.cwd(),
    });
    // expandTilde is a no-op on the already-absolute gateway cwd, so applying it
    // uniformly to whichever candidate won preserves the prior per-branch calls.
    return expandTilde(chosen, homedir());
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
    // Resolve in-flight approvals (broadcast still reaches attached subscribers) and
    // drop the session's secret/allow-list before tearing the handle down.
    this.approvals.clearSession(sessionId);
    if (handle.settingsFile) {
      try {
        unlinkSync(handle.settingsFile);
      } catch {
        // already gone
      }
    }
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
    this.adHoc.delete(sessionId);
  }
}
