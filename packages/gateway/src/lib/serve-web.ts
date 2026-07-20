import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/** Resolve a possibly-relative dir against the process cwd. */
function resolveDir(dir: string): string {
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

/**
 * Map a request path to the page file the export ships for it, or `null` when
 * there is none. The web app is built with `output: 'export'` + `trailingSlash`,
 * so every route is a real `‹route›/index.html` (root is `index.html`). Requests
 * with a file extension (`/_next/…`, `*.js`, `*.css`, images) are never pages —
 * they belong to the static wildcard — so we skip them here.
 */
function pageFileFor(root: string, url: string): string | null {
  const path = (url.split('?')[0] ?? '').split('#')[0] ?? '';
  if (/\.[a-zA-Z0-9]+$/.test(path)) return null; // has an extension → asset, not a page
  const rel = path === '/' || path === '' ? 'index.html' : `${path.replace(/^\/+|\/+$/g, '')}/index.html`;
  return existsSync(join(root, rel)) ? rel : null;
}

/** A top-level browser navigation (GET for HTML) — as opposed to a JSON/`fetch` API call. */
function isHtmlNavigation(req: FastifyRequest): boolean {
  if (req.method !== 'GET') return false;
  const accept = req.headers.accept ?? '';
  return accept.includes('text/html');
}

/**
 * Serve the web app's static export from the gateway, so a single process serves
 * both the API and the browser UI in prod (Phase 3) — the model the desktop app
 * relies on for single-origin SSO (Phase 77 D).
 *
 * The catch: the API has **no path prefix**, so its routes (`/tasks`, `/projects`,
 * `/sessions`, `/workflows`, `/councils`, …) collide *exactly* with the web app's
 * page routes of the same name. Fastify's router ranks a controller's specific
 * `GET /projects` ahead of this mount's `/*` wildcard, so a browser navigating to
 * `/projects` would get the controller's JSON instead of the page — which is what
 * broke the desktop app after single-origin landed.
 *
 * Fix: an `onRequest` hook that runs before routing resolves to a handler and
 * intercepts genuine browser navigations — a GET that `Accept`s `text/html` for a
 * path the export ships a page for — serving that page and short-circuiting the
 * API. API calls from the client use `fetch` (whose default `Accept` never
 * includes `text/html`), so they fall through to the controllers untouched; so do redirect
 * endpoints with no page file (`/auth/sso/:provider/start`, `…/callback`). Assets
 * (extensioned paths) are left to the `/*` static mount as before.
 *
 * Returns the resolved `root` (so the caller can log it without re-resolving) and
 * `served`: `true` when the export was found and mounted, `false` when `webDir`
 * has no `index.html` (so the caller can warn and carry on serving API-only).
 */
export type WebStaticResult = { served: boolean; root: string };

export async function registerWebStatic(
  fastify: FastifyInstance,
  webDir: string,
): Promise<WebStaticResult> {
  const root = resolveDir(webDir);
  if (!existsSync(join(root, 'index.html'))) return { served: false, root };

  await fastify.register(fastifyStatic as never, {
    root,
    prefix: '/',
    // `/uploads/` registered with `decorateReply: false`, so this is the first
    // (and only) mount to add `reply.sendFile` — which the navigation hook below
    // uses to serve a page ahead of a colliding API route.
    decorateReply: true,
  });

  // Serve page navigations before the API can answer them (see doc comment above).
  // Sending a reply from `onRequest` short-circuits the matched controller.
  fastify.addHook('onRequest', (req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) => {
    if (!isHtmlNavigation(req)) return done();
    const rel = pageFileFor(root, req.url);
    if (!rel) return done();
    // Takes over the response — do not call `done()` afterwards.
    void (reply as FastifyReply & { sendFile: (path: string) => FastifyReply }).sendFile(rel);
  });

  return { served: true, root };
}
