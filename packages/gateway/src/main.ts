import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { WsAdapter } from '@nestjs/platform-ws';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import { AppModule } from './app.module';
import { isAllowedOrigin } from './lib/allowed-origin';

// Walk up from the cwd to find the project's midnite.json. Needed because moon
// runs the gateway task from packages/gateway, not the repo root where the
// config lives — a bare join(cwd, 'midnite.json') silently misses it.
function findConfigPath(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'midnite.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function loadConfigFromDisk(): MidniteConfig {
  const configPath = findConfigPath();
  if (!configPath) {
    // eslint-disable-next-line no-console
    console.warn(
      `[midnite gateway] no midnite.json found from ${process.cwd()} upward — using defaults`,
    );
    return parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });
  }
  try {
    const config = parseConfig(JSON.parse(readFileSync(configPath, 'utf-8')));
    // eslint-disable-next-line no-console
    console.log(`[midnite gateway] loaded config from ${configPath}`);
    return config;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[midnite gateway] failed to parse ${configPath} — using defaults`, err);
    return parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });
  }
}

function resolveDir(p: string): string {
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

async function bootstrap() {
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
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[midnite gateway] failed to start', err);
  process.exit(1);
});
