// Phase 47 E — machine-readable output. A global `--json` flag turns every read
// command (and the create/update writes) into a single JSON value on stdout, with
// all chrome forced off so a script gets clean, parseable bytes.
//
// The mode is module-level state (not threaded through every action) set once in
// the root `preAction` hook, so both command bodies and the top-level error
// handler can read it. Enabling it also sets `NO_COLOR`, which the shared
// `isInteractive()` gate already honours — so colour, the palette, ora spinners,
// and the logo all go silent on the same switch.

let jsonEnabled = false;

/** Enable/disable JSON output. Called from the root `preAction` hook. */
export function setJsonMode(on: boolean): void {
  jsonEnabled = on;
  if (on) process.env.NO_COLOR = '1';
}

/** Whether `--json` is active. */
export function isJsonMode(): boolean {
  return jsonEnabled;
}

/** Write a validated payload to stdout as pretty JSON (the only thing on stdout). */
export function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

/** Write an error to stderr as `{ "error": "…" }`, keeping stdout clean. */
export function printJsonError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${JSON.stringify({ error: message }, null, 2)}\n`);
}
