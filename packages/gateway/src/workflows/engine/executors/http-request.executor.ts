import { Inject, Injectable, Optional } from '@nestjs/common';
import { HttpRequestParamsSchema, type HttpRequestParams, type MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../../../config.token';
import { isSafeHttpUrl } from '../../../projects/lib/opengraph';
import { WorkflowCredentialsService } from '../../credentials/workflow-credentials.service';
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

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    @Optional() @Inject(WorkflowCredentialsService)
    private readonly credentials?: WorkflowCredentialsService,
  ) {}

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

    // Resolve a saved credential and inject the appropriate auth header, taking
    // precedence over any explicit Authorization in `headers`.
    const resolvedHeaders: Record<string, string> = { ...params.headers };
    if (params.credentialId && this.credentials) {
      const cred = this.credentials.resolve(params.credentialId);
      if (!cred) {
        throw new Error(`credential ${params.credentialId} not found or could not be decrypted`);
      }
      if (cred.type === 'http-bearer') {
        resolvedHeaders['authorization'] = `Bearer ${cred.token}`;
      } else if (cred.type === 'http-basic') {
        const encoded = Buffer.from(`${cred.username}:${cred.password}`).toString('base64');
        resolvedHeaders['authorization'] = `Basic ${encoded}`;
      } else if (cred.type === 'http-header') {
        resolvedHeaders[cred.header.toLowerCase()] = cred.value;
      }
    }

    ctx.log('info', `${params.method} ${params.url}`);
    try {
      const hasBody = params.method !== 'GET' && params.method !== 'DELETE';
      const res = await fetch(params.url, {
        method: params.method,
        headers: resolvedHeaders,
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
