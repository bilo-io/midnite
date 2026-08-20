// Injection tokens for the `github/` module's two environment seams.
//
// These are real providers with real values, not `@Optional()` params leaning on
// emitted type metadata: `src/di-explicit-inject.test.ts` bans that combination
// because it fails **silently** (the param injects `undefined` and the feature quietly
// disables itself — exactly how the fail-open REST auth guard shipped). Naming the
// token means a wiring mistake is a boot error, and a unit spec still constructs the
// service directly with a faked `fetch` or a temp-dir home.

/** Options forwarded to the REST helpers — carries the injectable `fetch` in tests. */
export const GITHUB_FETCH_OPTIONS = Symbol('GITHUB_FETCH_OPTIONS');

/** Home directory used to collapse/expand `~` in checkout paths. */
export const GITHUB_HOME_DIR = Symbol('GITHUB_HOME_DIR');

/** `execFile` used for the `gh auth token` rung of the token ladder. */
export const GITHUB_EXEC_FILE = Symbol('GITHUB_EXEC_FILE');
