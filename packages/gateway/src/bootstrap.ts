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
import { isAllowedOrigin } from './lib/allowed-origin';
import { loadConfigFromDisk } from './lib/load-config';
import { registerWebStatic } from './lib/serve-web';

function resolveDir(p: string): string {
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
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

  // In prod, serve the web app's static export from the gateway (single process
  // serves API + UI). Off unless `gateway.webDir` (or MIDNITE_WEB_DIR) points at
  // a built export; the controllers' specific routes still win over the `/`
  // file mount. See lib/serve-web.ts.
  const { webDir } = config.gateway;
  if (webDir) {
    const served = await registerWebStatic(adapter.getInstance(), webDir);
    // eslint-disable-next-line no-console
    console.log(
      served
        ? `[midnite gateway] serving web app from ${resolveDir(webDir)}`
        : `[midnite gateway] webDir ${resolveDir(webDir)} has no index.html — serving API only`,
    );
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  // The gateway can spawn PTYs, so don't reflect arbitrary origins — only
  // loopback (the dev web app) plus any explicitly-configured origins.
  const { allowedOrigins } = config.gateway;
  app.enableCors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin, allowedOrigins)),
  });
  // Live terminal WS rides the same Fastify HTTP server, routed by gateway path.
  app.useWebSocketAdapter(new WsAdapter(app));

  const { port, host } = config.gateway;
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`[midnite gateway] listening on http://${host}:${port}`);
  return app;
}
