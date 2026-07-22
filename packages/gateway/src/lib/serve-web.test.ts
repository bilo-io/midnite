import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerWebStatic } from './serve-web.js';

describe('registerWebStatic', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'midnite-web-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns served:false and mounts nothing when the export has no index.html', async () => {
    const app = Fastify();
    const result = await registerWebStatic(app, dir);
    expect(result).toEqual({ served: false, root: dir });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('resolves a relative webDir to an absolute root', async () => {
    const app = Fastify();
    const result = await registerWebStatic(app, 'some/relative/export');
    expect(result.served).toBe(false); // dir doesn't exist, but resolution still happens
    expect(isAbsolute(result.root)).toBe(true);
    await app.close();
  });

  it('serves the static export, nested routes, and assets', async () => {
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>midnite</title>');
    mkdirSync(join(dir, 'board'));
    writeFileSync(join(dir, 'board', 'index.html'), '<!doctype html><title>board</title>');
    mkdirSync(join(dir, '_next'));
    writeFileSync(join(dir, '_next', 'app.js'), 'console.log("hi")');

    const app = Fastify();
    expect((await registerWebStatic(app, dir)).served).toBe(true);
    await app.ready();

    const root = await app.inject({ method: 'GET', url: '/' });
    expect(root.statusCode).toBe(200);
    expect(root.body).toContain('midnite');

    // trailingSlash export → /board/ resolves to board/index.html
    const nested = await app.inject({ method: 'GET', url: '/board/' });
    expect(nested.statusCode).toBe(200);
    expect(nested.body).toContain('board');

    const asset = await app.inject({ method: 'GET', url: '/_next/app.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toContain('console.log');

    const missing = await app.inject({ method: 'GET', url: '/no/such/path' });
    expect(missing.statusCode).toBe(404);

    await app.close();
  });

  it('lets a specific API route win over the catch-all file mount', async () => {
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>midnite</title>');

    const app = Fastify();
    // Mirror the bootstrap order: the file mount is registered before the
    // controllers' routes; Fastify still matches the specific route first.
    expect((await registerWebStatic(app, dir)).served).toBe(true);
    app.get('/tasks', async () => ({ ok: true }));
    await app.ready();

    const api = await app.inject({ method: 'GET', url: '/tasks' });
    expect(api.statusCode).toBe(200);
    expect(api.json()).toEqual({ ok: true });

    // a non-API path still falls through to the file mount
    const ui = await app.inject({ method: 'GET', url: '/' });
    expect(ui.statusCode).toBe(200);
    expect(ui.body).toContain('midnite');

    await app.close();
  });

  it('serves the page for a browser navigation that collides with an API route', async () => {
    // The API has no path prefix, so `/projects` is BOTH a page and a controller.
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>midnite</title>');
    mkdirSync(join(dir, 'projects'));
    writeFileSync(join(dir, 'projects', 'index.html'), '<!doctype html><title>projects-page</title>');

    const app = Fastify();
    expect((await registerWebStatic(app, dir)).served).toBe(true);
    app.get('/projects', async () => ({ items: [] }));
    await app.ready();

    // Browser top-level navigation → the page wins over the colliding API route,
    // with or without the trailingSlash the export emits.
    for (const url of ['/projects', '/projects/']) {
      const nav = await app.inject({ method: 'GET', url, headers: { accept: 'text/html,application/xhtml+xml' } });
      expect(nav.statusCode).toBe(200);
      expect(nav.body).toContain('projects-page');
    }

    // A client `fetch` (Accept: */*) still reaches the API and gets JSON.
    const data = await app.inject({ method: 'GET', url: '/projects', headers: { accept: '*/*' } });
    expect(data.statusCode).toBe(200);
    expect(data.json()).toEqual({ items: [] });

    // A JSON-typed request also reaches the API.
    const json = await app.inject({ method: 'GET', url: '/projects', headers: { accept: 'application/json' } });
    expect(json.json()).toEqual({ items: [] });

    await app.close();
  });

  it('serves an RSC flight file that collides with a param API route', async () => {
    // Next's client router fetches `/tasks/index.txt?_rsc=…` on every client-side
    // navigation. Fastify ranks `GET /tasks/:id` above the static `/*` wildcard,
    // so without the onRequest intercept the API answers (id = "index.txt"), the
    // flight fetch fails, and the router falls back to a full document reload.
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>midnite</title>');
    mkdirSync(join(dir, 'tasks'));
    writeFileSync(join(dir, 'tasks', 'index.html'), '<!doctype html><title>tasks-page</title>');
    writeFileSync(join(dir, 'tasks', 'index.txt'), 'flight-payload');

    const app = Fastify();
    expect((await registerWebStatic(app, dir)).served).toBe(true);
    app.get('/tasks/:id', async (req) => ({ id: (req.params as { id: string }).id }));
    await app.ready();

    // The flight fetch (a plain fetch — Accept: */*) gets the file, not the API.
    const flight = await app.inject({ method: 'GET', url: '/tasks/index.txt?_rsc=abc123' });
    expect(flight.statusCode).toBe(200);
    expect(flight.body).toBe('flight-payload');

    // A real API lookup (extensionless) still reaches the controller.
    const api = await app.inject({ method: 'GET', url: '/tasks/42' });
    expect(api.statusCode).toBe(200);
    expect(api.json()).toEqual({ id: '42' });

    // A path that names no export file falls through to the API too.
    const miss = await app.inject({ method: 'GET', url: '/tasks/report.txt' });
    expect(miss.statusCode).toBe(200);
    expect(miss.json()).toEqual({ id: 'report.txt' });

    await app.close();
  });

  it('never serves a file outside the export root', async () => {
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>midnite</title>');
    writeFileSync(join(dir, '..', 'outside.txt'), 'secret');

    const app = Fastify();
    expect((await registerWebStatic(app, dir)).served).toBe(true);
    await app.ready();

    for (const url of ['/../outside.txt', '/%2e%2e/outside.txt', '/tasks/%2E%2E/../outside.txt']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.body).not.toContain('secret');
    }

    rmSync(join(dir, '..', 'outside.txt'), { force: true });
    await app.close();
  });

  it('lets a redirect endpoint with no page file through to the API on a browser navigation', async () => {
    // SSO start/callback are browser navigations (Accept: text/html) but have no
    // page file in the export, so they must reach the controller (302), not 404.
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>midnite</title>');

    const app = Fastify();
    expect((await registerWebStatic(app, dir)).served).toBe(true);
    app.get('/auth/sso/:provider/start', async (_req, reply) => reply.redirect('https://provider.example/oauth', 302));
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/auth/sso/github/start',
      headers: { accept: 'text/html' },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('https://provider.example/oauth');

    await app.close();
  });
});
