import type { MidniteConfig } from '@midnite/shared';

/**
 * Is `rawUrl` pointing at the gateway's own origin (the `workflows.webhookBaseUrl`)?
 *
 * The `http.request` executor blocks loopback URLs by default (SSRF guard). But the
 * common, legitimate case is a workflow calling *its own gateway* — the demo
 * `/playground/*` endpoints, or a real route like `/tasks` — which on a local install
 * lives at `http://localhost:7777`. This lets that one origin through without opening
 * loopback wholesale: only an exact origin match against the configured base URL
 * counts, so arbitrary `localhost`/private-range targets stay blocked.
 */
export function isGatewaySelfOrigin(rawUrl: string, config: MidniteConfig): boolean {
  let target: URL;
  let base: URL;
  try {
    target = new URL(rawUrl);
    base = new URL(config.workflows.webhookBaseUrl);
  } catch {
    return false;
  }
  return target.origin === base.origin;
}
