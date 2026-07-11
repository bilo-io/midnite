import { All, Controller, Get, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

/**
 * A tiny httpbin-style demo API (no auth — see `isAuthExemptPath`). It exists so the
 * example workflows have a **live** HTTP target that echoes their request and returns
 * canned JSON, letting an `http.request` node showcase every REST method and its
 * input/output in the run panel without any credential setup or external dependency.
 *
 * `/playground/echo` reflects the request back on GET/POST/PUT/PATCH/DELETE; the two
 * data routes back the digest / stateful-tracking example workflows.
 */
type EchoResponse = {
  method: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, unknown>;
  body: unknown;
  receivedAt: string;
};

@Controller('playground')
export class PlaygroundController {
  /** Reflect the incoming request on any method — the canonical "what did my node send?" target. */
  @All('echo')
  echo(@Req() req: FastifyRequest): EchoResponse {
    return {
      method: (req.method ?? 'GET').toUpperCase(),
      path: (req.url ?? '/').split('?')[0]!,
      query: (req.query as Record<string, unknown>) ?? {},
      headers: req.headers as Record<string, unknown>,
      body: req.body ?? null,
      receivedAt: new Date().toISOString(),
    };
  }

  /** Canned list payload — backs the "fetch → filter → digest" example. */
  @Get('items')
  items(): { generatedAt: string; count: number; items: { id: number; title: string; url: string }[] } {
    const items = [
      { id: 1, title: 'Ship the workflow engine', url: 'https://example.test/items/1' },
      { id: 2, title: 'Wire up the demo playground', url: 'https://example.test/items/2' },
      { id: 3, title: 'Retire the schedules facade', url: 'https://example.test/items/3' },
    ];
    return { generatedAt: new Date().toISOString(), count: items.length, items };
  }

  /** Canned single value — backs the "track the latest value across runs" example. */
  @Get('latest')
  latest(): { value: number; updatedAt: string } {
    // A stable pseudo-value derived from the current minute, so successive runs can
    // observe it change without any real backing store.
    const now = new Date();
    return { value: now.getUTCHours() * 60 + now.getUTCMinutes(), updatedAt: now.toISOString() };
  }
}
