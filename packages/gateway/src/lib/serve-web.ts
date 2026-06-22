import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

/** Resolve a possibly-relative dir against the process cwd. */
function resolveDir(dir: string): string {
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

/**
 * Serve the web app's static export from the gateway, so a single process serves
 * both the API and the browser UI in prod (Phase 3). The web app is built with
 * Next's `output: 'export'` — a fully static, multi-page bundle where every route
 * is a real `‹route›/index.html` and all data is fetched client-side from this
 * same gateway. So this is a plain static mount at `/`: no SSR, no SPA fallback,
 * no Next server process.
 *
 * The API keeps priority over the file server: the Nest controllers register
 * specific paths (`/tasks`, `/search`, `/uploads/…`, …) which Fastify matches
 * ahead of this mount's `/*` wildcard, and the live-terminal WS upgrade is not a
 * GET route. A request for a path with no matching controller and no file 404s
 * (the export ships its own `404.html`).
 *
 * Returns `true` when the export was found and mounted, `false` when `webDir`
 * has no `index.html` (so the caller can warn and carry on serving API-only).
 */
export async function registerWebStatic(
  fastify: FastifyInstance,
  webDir: string,
): Promise<boolean> {
  const root = resolveDir(webDir);
  if (!existsSync(join(root, 'index.html'))) return false;

  await fastify.register(fastifyStatic as never, {
    root,
    prefix: '/',
    // `/uploads/` already registered the decorator; a second one would throw.
    decorateReply: false,
  });
  return true;
}
