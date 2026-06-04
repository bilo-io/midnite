import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Logger } from '@nestjs/common';

const execFileAsync = promisify(execFile);

export type AnthropicCredential =
  | { kind: 'apiKey'; value: string; source: 'env' }
  | { kind: 'oauth'; value: string; source: 'claude-cli-keychain' };

type ResolverLogger = Pick<Logger, 'log' | 'warn'>;

const KEYCHAIN_SERVICE = 'Claude Code-credentials';

export async function resolveAnthropicCredential(
  logger: ResolverLogger,
): Promise<AnthropicCredential | null> {
  const envKey = process.env['ANTHROPIC_API_KEY'];
  if (envKey) {
    return { kind: 'apiKey', value: envKey, source: 'env' };
  }

  if (process.platform !== 'darwin') {
    logger.warn(
      `ANTHROPIC_API_KEY not set and Claude CLI fallback is macOS-only (platform=${process.platform}).`,
    );
    return null;
  }

  const account = process.env['USER'];
  if (!account) {
    logger.warn('Cannot read Claude CLI keychain entry: $USER is not set.');
    return null;
  }

  const oauth = await readClaudeCliKeychain(account, logger);
  if (!oauth) return null;
  return { kind: 'oauth', value: oauth, source: 'claude-cli-keychain' };
}

async function readClaudeCliKeychain(
  account: string,
  logger: ResolverLogger,
): Promise<string | null> {
  let raw: string;
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-s',
      KEYCHAIN_SERVICE,
      '-a',
      account,
      '-w',
    ]);
    raw = stdout.trim();
  } catch {
    logger.warn(
      'No Claude CLI credentials found in macOS keychain — run `claude` to log in, or set ANTHROPIC_API_KEY.',
    );
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.warn('Claude CLI keychain entry is not valid JSON; ignoring.');
    return null;
  }

  const token = extractAccessToken(parsed);
  if (!token) {
    logger.warn(
      'Claude CLI keychain entry did not contain an accessToken; ignoring.',
    );
    return null;
  }
  return token;
}

function extractAccessToken(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const root = parsed as Record<string, unknown>;
  const oauth = root['claudeAiOauth'];
  if (!oauth || typeof oauth !== 'object') return null;
  const token = (oauth as Record<string, unknown>)['accessToken'];
  return typeof token === 'string' && token.length > 0 ? token : null;
}
