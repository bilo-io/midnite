import { verifyGeneric } from '../lib/verify-signature';
import { asRecord, header, type InboundAdapter, type MappedTask } from './types';

/**
 * The generic, documented contract for any custom sender. Signature mirrors Phase
 * 44's outbound scheme: `X-Midnite-Signature: sha256=<hex over `${ts}.${body}`>`
 * + `X-Midnite-Timestamp`. Payload shape (stable + documented):
 *   { event?: string, externalId?: string, title: string, body?: string, url?: string }
 */
export const genericAdapter: InboundAdapter = {
  provider: 'generic',

  verify(req, secret) {
    return verifyGeneric(
      secret,
      req.rawBody,
      header(req, 'x-midnite-signature'),
      header(req, 'x-midnite-timestamp'),
    );
  },

  eventKey(req) {
    const event = asRecord(req.parsed).event;
    return typeof event === 'string' && event ? event : null;
  },

  externalId(req) {
    const delivery = header(req, 'x-midnite-delivery');
    if (delivery) return delivery;
    const ext = asRecord(req.parsed).externalId;
    return typeof ext === 'string' && ext ? ext : null;
  },

  toTask(req): MappedTask | null {
    const p = asRecord(req.parsed);
    const title = typeof p.title === 'string' ? p.title : null;
    if (!title) return null;
    const body = typeof p.body === 'string' ? p.body : '';
    const url = typeof p.url === 'string' ? p.url : undefined;
    const prompt = body.trim() ? `${title}\n\n${truncate(body, 2000)}` : title;
    return { prompt, sourceUrl: url };
  },
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
