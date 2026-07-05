import { verifyGithub } from '../lib/verify-signature';
import { asRecord, header, type InboundAdapter, type MappedTask } from './types';

/**
 * GitHub webhooks. Signature: `X-Hub-Signature-256: sha256=<hex over body>`.
 * Event key: `<X-GitHub-Event>.<action>` (e.g. `issues.opened`,
 * `pull_request.opened`). Maps an opened issue/PR → title + body + html_url.
 */
export const githubAdapter: InboundAdapter = {
  provider: 'github',

  verify(req, secret) {
    return verifyGithub(secret, req.rawBody, header(req, 'x-hub-signature-256'));
  },

  eventKey(req) {
    const event = header(req, 'x-github-event');
    if (!event) return null;
    const action = asRecord(req.parsed).action;
    return typeof action === 'string' ? `${event}.${action}` : event;
  },

  externalId(req) {
    // Prefer GitHub's per-delivery id; fall back to the issue/PR node id.
    const delivery = header(req, 'x-github-delivery');
    if (delivery) return delivery;
    const p = asRecord(req.parsed);
    const subject = asRecord(p.issue ?? p.pull_request);
    const id = subject.id ?? subject.node_id;
    return id != null ? String(id) : null;
  },

  toTask(req): MappedTask | null {
    const p = asRecord(req.parsed);
    const subject = asRecord(p.issue ?? p.pull_request);
    const title = typeof subject.title === 'string' ? subject.title : null;
    if (!title) return null;
    const body = typeof subject.body === 'string' ? subject.body : '';
    const url = typeof subject.html_url === 'string' ? subject.html_url : undefined;
    const prompt = body.trim() ? `${title}\n\n${truncate(body, 2000)}` : title;
    return { prompt, sourceUrl: url };
  },
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
