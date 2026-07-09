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
  let raw: string;
  try {
    raw = await readFile(authPath(), 'utf8');
  } catch {
    // No file (logged out) — not an error.
    return null;
  }
  try {
    return JSON.parse(raw) as AuthData;
  } catch {
    // The file exists but is corrupt/truncated — degrade to logged-out, but
    // don't silently pretend it was simply absent (Phase 60 G finding SW-4).
    // stderr keeps `--json` stdout clean.
    process.stderr.write('midnite: stored credentials are unreadable — re-run `midnite login`\n');
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
 * The env vars that can supply a bearer token without a stored login — so CI
 * needn't write `~/.config/midnite/auth.json` to disk (Phase 60 Theme K).
 * `MIDNITE_TOKEN` is the documented name; `MIDNITE_AUTH_TOKEN` is kept as a
 * back-compat alias. First non-empty wins.
 */
const TOKEN_ENV_VARS = ['MIDNITE_TOKEN', 'MIDNITE_AUTH_TOKEN'] as const;

/** The token from the environment, if any of {@link TOKEN_ENV_VARS} is set non-empty. */
export function envToken(): string | undefined {
  for (const name of TOKEN_ENV_VARS) {
    const v = process.env[name];
    if (v) return v;
  }
  return undefined;
}

/**
 * Resolve the bearer token to send on a request.
 * Priority: stored JWT > `MIDNITE_TOKEN`/`MIDNITE_AUTH_TOKEN` env > `--token` flag.
 * (Disk wins over env so an interactive `midnite login` isn't shadowed by a stray
 * env var; CI, which never writes the file, falls straight through to the env.)
 */
export async function resolveToken(flagToken?: string): Promise<string | undefined> {
  const stored = await readAuth();
  if (stored?.accessToken) return stored.accessToken;
  return envToken() ?? flagToken;
}
