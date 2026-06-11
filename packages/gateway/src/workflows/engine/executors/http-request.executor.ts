import { Inject, Injectable } from '@nestjs/common';
import { HttpRequestParamsSchema, type HttpRequestParams, type MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../../../config.token';
import { isSafeHttpUrl } from '../../../projects/lib/opengraph';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

const MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MB cap to avoid memory bombs

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
      if (total >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
  }
  return Buffer.concat(chunks).toString('utf-8');
}

@Injectable()
export class HttpRequestExecutor implements NodeExecutor {
  readonly typeId = 'http.request';

  constructor(@Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = HttpRequestParamsSchema.parse(ctx.params) as HttpRequestParams;
    if (!isSafeHttpUrl(params.url, { allowLoopback: this.config.workflows.allowLoopbackHttp })) {
      throw new Error(`refusing to call unsafe or private URL: ${params.url}`);
    }

    // Combine the run's abort signal with a per-request timeout.
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    ctx.signal.addEventListener('abort', onAbort);
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs);

    ctx.log('info', `${params.method} ${params.url}`);
    try {
      const hasBody = params.method !== 'GET' && params.method !== 'DELETE';
      const res = await fetch(params.url, {
        method: params.method,
        headers: params.headers,
        body: hasBody ? params.body : undefined,
        redirect: 'follow',
        signal: controller.signal,
      });
      const text = await readCapped(res, MAX_RESPONSE_BYTES);
      const contentType = res.headers.get('content-type') ?? '';
      let body: unknown = text;
      if (contentType.includes('json')) {
        try {
          body = JSON.parse(text);
        } catch {
          // keep raw text on parse failure
        }
      }
      ctx.log('info', `← ${res.status} ${res.statusText}`);
      return {
        status: res.status,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
        body,
      };
    } finally {
      clearTimeout(timeout);
      ctx.signal.removeEventListener('abort', onAbort);
    }
  }
}
