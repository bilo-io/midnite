import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { WsAdapter } from '@nestjs/platform-ws';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { mkdirSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { AppModule } from './app.module';
import { PreflightService } from './health/preflight.service';
import { isLoopbackHost, isValidBearer, resolveAuthToken } from './auth/lib/auth-policy';
import { isAllowedOrigin } from './lib/allowed-origin';
import { loadConfigFromDisk } from './lib/load-config';
import { registerWebStatic } from './lib/serve-web';

function resolveDir(p: string): string {
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

/**
 * Fail-closed (Phase 7 A5): binding a non-loopback host with no auth token would
 * expose an unauthenticated, PTY-spawning API on the network. Refuse to boot
 * unless the operator either sets a token or explicitly opts out
 * (`gateway.auth.requireOnNonLoopback: false`). Loopback binds (the default) are
 * unaffected.
 */
function assertAuthForHost(config: ReturnType<typeof loadConfigFromDisk>): void {
  const { host, auth } = config.gateway;
  if (isLoopbackHost(host) || !auth.requireOnNonLoopback) return;
  if (!resolveAuthToken(config)) {
    throw new Error(
      `gateway.host is non-loopback (${host}) but no auth token is set: define $${auth.tokenEnv}, ` +
        `or set gateway.auth.requireOnNonLoopback=false to bind it unauthenticated on purpose`,
    );
  }
}

/**
 * Build, configure, and start the gateway HTTP/WS server. Extracted from main.ts
 * so it can be driven programmatically — `midnite serve` and the Electron desktop
 * main process both boot the gateway in-process by calling this.
 *
 * Config is loaded from disk (+ env overrides) here, exactly as the DI
 * ConfigModule does, so the two never disagree. Callers steer config via env
 * (MIDNITE_CONFIG_PATH, MIDNITE_GATEWAY_PORT, …), not by passing an object.
 */
export async function startGateway(): Promise<NestFastifyApplication> {
  const config = loadConfigFromDisk();
  // Fail-closed before binding: never expose an unauthenticated API off-box.
  assertAuthForHost(config);
  const adapter = new FastifyAdapter();

  const uploadsDir = resolveDir(config.gateway.uploadsDir);
  mkdirSync(uploadsDir, { recursive: true });

  await adapter.register(multipart as never, {
    limits: {
      fileSize: 8 * 1024 * 1024, // 8 MB
      files: 10,
    },
  });

  await adapter.register(fastifyStatic as never, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // `@fastify/static` serves `/uploads/*` natively on the Fastify instance, so
  // Nest's global auth guard (an APP_GUARD, Nest-routes-only) never covers it.
  // When bearer auth is on, guard the uploads route here too — those are real
  // user attachments/media, not public assets. (The web export below stays
  // public: it's the client shell, and the data it fetches goes through the
  // guarded API; the browser also can't ride a bearer on its initial document GET.)
  const authToken = resolveAuthToken(config);
  if (authToken) {
    adapter.getInstance().addHook('onRequest', (req, reply, done) => {
      if ((req.url ?? '').startsWith('/uploads/') && !isValidBearer(req.headers.authorization, authToken)) {
        reply.code(401).send({ statusCode: 401, message: 'missing or invalid bearer token' });
        return;
      }
      done();
    });
  }

  // In prod, serve the web app's static export from the gateway (single process
  // serves API + UI). Off unless `gateway.webDir` (or MIDNITE_WEB_DIR) points at
  // a built export; the controllers' specific routes still win over the `/`
  // file mount. See lib/serve-web.ts.
  const { webDir } = config.gateway;
  if (webDir) {
    const { served, root } = await registerWebStatic(adapter.getInstance(), webDir);
    // eslint-disable-next-line no-console
    console.log(
      served
        ? `[midnite gateway] serving web app from ${root}`
        : `[midnite gateway] webDir ${root} has no index.html — serving API only`,
    );
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    // Capture the raw request body so the inbound receiver's HMAC (Phase 46 B)
    // covers exactly the bytes the sender signed — a re-serialized body would
    // break signatures. Nest exposes it as `req.rawBody` (a Buffer); every route's
    // parsed body is unchanged.
    { rawBody: true },
  );

  // The gateway can spawn PTYs, so don't reflect arbitrary origins — only
  // loopback (the dev web app) plus any explicitly-configured origins.
  const { allowedOrigins } = config.gateway;
  app.enableCors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin, allowedOrigins)),
  });
  // Live terminal WS rides the same Fastify HTTP server, routed by gateway path.
  app.useWebSocketAdapter(new WsAdapter(app));

  // Register SIGINT/SIGTERM listeners so Nest runs onModuleDestroy on shutdown —
  // without this the terminal service's PTY teardown (kill under `pty`, detach
  // under `tmux`) and the schedulers' timer cleanup never fire on a normal exit,
  // orphaning live PTYs. (Phase 7 A4.)
  app.enableShutdownHooks();

  // Boot preflight (Phase 54 A): validate the process can actually run before it
  // binds. Runs after the module graph is up (so it has DI + a migrated DB) but
  // before listen(); a hard failure (or any warning under gateway.strictBoot)
  // logs an actionable report and exits non-zero rather than serving degraded.
  await app.get(PreflightService).run();

  const { port, host } = config.gateway;
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`[midnite gateway] listening on http://${host}:${port}`);
  return app;
}
