const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Gate cross-origin access to the gateway (HTTP CORS + the terminal WS upgrade).
 *
 * The gateway can spawn PTYs, so an attacker-controlled web page must not be able
 * to reach it. A local-first tool should trust only the loopback web app (any
 * port) plus explicitly-configured origins. Requests with **no** `Origin`
 * (CLI, server-to-server, non-browser WS clients) are allowed — the browser
 * CSRF/drive-by threat only exists when an `Origin` is present.
 */
export function isAllowedOrigin(origin: string | undefined | null, allowed: string[]): boolean {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  try {
    return LOOPBACK_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}
