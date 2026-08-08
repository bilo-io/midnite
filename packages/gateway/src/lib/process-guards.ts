/**
 * Process-level last-resort handlers for the gateway.
 *
 * Node ≥15 terminates the process on an unhandled promise rejection. The gateway
 * had no handler, so `main.ts`'s `.catch()` covered **boot failure only** — any
 * unhandled rejection after boot killed it outright.
 *
 * That's worst in the desktop app. The gateway runs there as a *child process*
 * (`desktop/src/main/gateway-process.ts` spawns it), and the main process pipes
 * its stdout/stderr but registers **no `exit` handler on it**. So a rejection
 * deep in a service kills the gateway while the Electron window stays open
 * pointing at a dead server: every request fails with "could not reach the
 * gateway" and nothing says the backend died or offers a restart. Turning that
 * silent death into a logged, survivable one is the whole point.
 *
 * These do NOT make errors safe to ignore. They convert an invisible process
 * death into a diagnosable one, logged where the failure screen tells users to
 * look. Individual call sites still own their error handling — every scheduler
 * tick already wraps its body in try/catch.
 */

/** Whether {@link installProcessGuards} has already run in this process. */
let installed = false;

export type ProcessGuardOptions = {
  /** Where to report. Defaults to `console` so this works before Nest boots. */
  log?: (message: string, err: unknown) => void;
  /** Exit on an uncaught *exception* (not a rejection). Default true. */
  exitOnUncaught?: boolean;
  /** Injected for tests. */
  onExit?: (code: number) => void;
};

/**
 * Install the handlers. Idempotent — a second call is a no-op, so an embedded
 * gateway that boots twice in one process can't stack duplicate listeners.
 */
export function installProcessGuards(opts: ProcessGuardOptions = {}): boolean {
  if (installed) return false;
  installed = true;

  const log =
    opts.log ??
    ((message: string, err: unknown) => {
      // eslint-disable-next-line no-console -- runs before/outside the Nest logger
      console.error(message, err);
    });
  const exit = opts.onExit ?? ((code: number) => process.exit(code));

  // A rejection is logged and swallowed: the process is usually still coherent
  // (one request or timer failed), and killing the desktop app over it is a
  // worse outcome than continuing in a known-degraded state.
  process.on('unhandledRejection', (reason) => {
    log('[midnite gateway] unhandled promise rejection — this is a bug, please report it', reason);
  });

  // An uncaught *exception* is different: the stack that threw is gone and the
  // process may be mid-mutation, so continuing risks corrupting state. Log, then
  // exit non-zero so a supervisor (or the desktop app's health wait) restarts us.
  process.on('uncaughtException', (err) => {
    log('[midnite gateway] uncaught exception — exiting', err);
    if (opts.exitOnUncaught !== false) exit(1);
  });

  return true;
}

/** Test seam: forget that the guards were installed. */
export function resetProcessGuardsForTest(): void {
  installed = false;
}
