import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { mkdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import { AppModule } from './app.module';

function loadConfigFromDisk(): MidniteConfig {
  const configPath = join(process.cwd(), 'midnite.json');
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    return parseConfig(raw);
  } catch {
    return parseConfig({
      agent: {},
      terminal: {},
      knowledge: {},
      gateway: {},
    });
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

  app.enableCors({ origin: true });

  const port = config.gateway.port;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[midnite gateway] listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[midnite gateway] failed to start', err);
  process.exit(1);
});
