import { verifyLinear } from '../lib/verify-signature';
import { asRecord, header, type InboundAdapter, type InboundRequest, type MappedTask } from './types';

/**
 * Linear webhooks. Signature: `Linear-Signature: <hex over body>` (no prefix).
 * Payload carries `{ type, action, data, url }`; event key is `<type>.<action>`
 * (e.g. `Issue.create`). Maps a created issue → title + description + url.
 */
export const linearAdapter: InboundAdapter = {
  provider: 'linear',

  verify(req, secret) {
    return verifyLinear(secret, req.rawBody, header(req, 'linear-signature'));
  },

  eventKey(req) {
    const p = asRecord(req.parsed);
    const type = typeof p.type === 'string' ? p.type : null;
    const action = typeof p.action === 'string' ? p.action : null;
    if (!type) return null;
    return action ? `${type}.${action}` : type;
  },

  externalId(req) {
    const p = asRecord(req.parsed);
    // Linear sends a top-level `webhookId`/`webhookTimestamp`; the stable item id
    // is `data.id`. Prefer the data id (dedups the same issue), else webhookId.
    const data = asRecord(p.data);
    if (data.id != null) return String(data.id);
    return typeof p.webhookId === 'string' ? p.webhookId : null;
  },

  toTask(req): MappedTask | null {
    const p = asRecord(req.parsed);
    const data = asRecord(p.data);
    const title = typeof data.title === 'string' ? data.title : null;
    if (!title) return null;
    const description = typeof data.description === 'string' ? data.description : '';
    const url = typeof p.url === 'string' ? p.url : typeof data.url === 'string' ? data.url : undefined;
    const prompt = description.trim() ? `${title}\n\n${truncate(description, 2000)}` : title;
    return { prompt, sourceUrl: url };
  },
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
