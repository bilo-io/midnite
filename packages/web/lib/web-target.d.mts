// Types for web-target.mjs (Phase 72 D) — the .mjs is plain JS so next.config.mjs
// can import it under Node; this sibling gives the vitest unit + tsc real types
// (an untyped .mjs import would trip TS7016).

export type WebTarget = 'static' | 'server';

/** The resolved build target: 'server' when MIDNITE_WEB_TARGET=server, else 'static'. */
export function resolveWebTarget(env: Record<string, string | undefined>): WebTarget;

/** Next's `output`: 'export' for the static (default) target, undefined for server. */
export function resolveWebOutput(env: Record<string, string | undefined>): 'export' | undefined;
