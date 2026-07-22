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

/**
 * Map an extensioned request path to the export file it names, or `null` when
 * the export doesn't ship one. Extensioned paths normally belong to the static
 * `/*` wildcard — but Fastify ranks a param API route *above* a wildcard, so a
 * page's RSC flight file (`/tasks/index.txt?_rsc=…`, fetched by Next's client
 * router on every navigation) is swallowed by `GET /tasks/:id` (id =
 * "index.txt"), the router's fetch fails, and Next falls back to a full
 * document load — the "whole app reloads on some nav items" bug. Serving any
 * file the export really ships ahead of routing closes that hole.
 */
function assetFileFor(root: string, url: string): string | null {
  const path = (url.split('?')[0] ?? '').split('#')[0] ?? '';
  if (!/\.[a-zA-Z0-9]+$/.test(path)) return null; // extensionless → page, not asset
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null; // malformed escape → not a file we ship
  }
  if (decoded.split('/').includes('..')) return null; // never escape the export root
  const rel = decoded.replace(/^\/+/, '');
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
 * (extensioned paths) that the export ships are served here too — a param API
 * route (`GET /tasks/:id`) outranks the `/*` wildcard, so leaving them to the
 * static mount let the API swallow the pages' RSC flight files and forced full
 * document reloads on client-side navigation (see `assetFileFor`).
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

  // Serve page navigations — and any asset the export really ships (RSC flight
  // `.txt` files above all) — before the API can answer them (see doc comments
  // above). Sending a reply from `onRequest` short-circuits the matched controller.
  fastify.addHook('onRequest', (req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) => {
    if (req.method !== 'GET') return done();
    // Disjoint by construction: assets have an extension, pages don't.
    const rel = assetFileFor(root, req.url) ?? (isHtmlNavigation(req) ? pageFileFor(root, req.url) : null);
    if (!rel) return done();
    // Takes over the response — do not call `done()` afterwards.
    void (reply as FastifyReply & { sendFile: (path: string) => FastifyReply }).sendFile(rel);
  });

  return { served: true, root };
}
