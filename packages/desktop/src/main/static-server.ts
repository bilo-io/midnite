import { createServer, type Server } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

/**
 * Serve the Next static export (`output: 'export'`, `trailingSlash: true`) over
 * loopback http. We don't load the renderer from file:// — that yields an
 * `Origin: null` and breaks App Router asset/WS resolution. A loopback origin is
 * accepted by the gateway's CORS (loopback always allowed).
 */
export function serveStatic(root: string, port: number): Promise<Server> {
  const server = createServer((req, res) => {
    void handle(root, req.url ?? '/', res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function handle(
  root: string,
  url: string,
  res: import('node:http').ServerResponse,
): Promise<void> {
  try {
    const urlPath = decodeURIComponent(url.split('?')[0] ?? '/');
    const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(root, rel);
    try {
      if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
      // not a dir — fall through to read attempt + fallback
    }
    let body: Buffer;
    try {
      body = await readFile(filePath);
    } catch {
      // Unknown path → serve the export's root index (client routing handles it).
      try {
        body = await readFile(join(root, 'index.html'));
        filePath = 'index.html';
      } catch {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
    }
    res.setHeader('content-type', MIME[extname(filePath)] ?? 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 500;
    res.end('internal error');
  }
}
