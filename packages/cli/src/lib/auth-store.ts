import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface AuthData {
  accessToken: string;
  refreshToken: string;
}

function authPath(): string {
  return join(homedir(), '.config', 'midnite', 'auth.json');
}

/** Read the persisted auth tokens, or null if none are stored. */
export async function readAuth(): Promise<AuthData | null> {
  try {
    const raw = await readFile(authPath(), 'utf8');
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
}

/** Persist tokens to `~/.config/midnite/auth.json`. */
export async function writeAuth(data: AuthData): Promise<void> {
  const path = authPath();
  await mkdir(join(homedir(), '.config', 'midnite'), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
}

/** Delete the stored tokens. */
export async function clearAuth(): Promise<void> {
  try {
    await unlink(authPath());
  } catch {
    // Already gone — not an error.
  }
}

/**
 * Resolve the bearer token to send on a request.
 * Priority: stored JWT > `MIDNITE_AUTH_TOKEN` env > `--token` flag value.
 */
export async function resolveToken(flagToken?: string): Promise<string | undefined> {
  const stored = await readAuth();
  if (stored?.accessToken) return stored.accessToken;
  const env = process.env['MIDNITE_AUTH_TOKEN'];
  if (env) return env;
  return flagToken;
}
