import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

  it('returns false and mounts nothing when the export has no index.html', async () => {
    const app = Fastify();
    expect(await registerWebStatic(app, dir)).toBe(false);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('serves the static export, nested routes, and assets', async () => {
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>midnite</title>');
    mkdirSync(join(dir, 'board'));
    writeFileSync(join(dir, 'board', 'index.html'), '<!doctype html><title>board</title>');
    mkdirSync(join(dir, '_next'));
    writeFileSync(join(dir, '_next', 'app.js'), 'console.log("hi")');

    const app = Fastify();
    expect(await registerWebStatic(app, dir)).toBe(true);
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
    expect(await registerWebStatic(app, dir)).toBe(true);
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
});
