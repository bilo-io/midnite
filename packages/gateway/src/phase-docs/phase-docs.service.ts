import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';
import { phaseDocFilename, type PhaseDoc } from '@midnite/shared';

const execFileAsync = promisify(execFile);

/** Directory in the repo where phase docs live. */
const PHASES_DIR = '.midnite/phases';
const GH_TIMEOUT_MS = 20_000;
const MAX_BUFFER = 16 * 1024 * 1024;

/** Thrown when a write loses the optimistic-concurrency race (stale SHA → 409). */
export class PhaseDocConflictError extends Error {}
/** Thrown when `gh` is missing, unauthenticated, or GitHub itself fails. */
export class GithubUnavailableError extends Error {}
/** Internal marker: the Contents API returned 404 (path doesn't exist). */
class NotFoundError extends Error {}

/** A single entry from the GitHub Contents API. */
type GhContentEntry = {
  type: string;
  name: string;
  path: string;
  sha: string;
  content?: string;
  encoding?: string;
};

/**
 * Reads and writes phase docs in a project's linked GitHub repo via the `gh` CLI
 * (the same local-auth path `PrStatusService` uses). All files live under
 * `.midnite/phases/`. Writes go through the Contents API, which requires the
 * current blob SHA — a stale SHA surfaces as a {@link PhaseDocConflictError} so
 * the editor can prompt a reload-and-retry.
 */
@Injectable()
export class PhaseDocsService {
  private readonly logger = new Logger(PhaseDocsService.name);

  async list(ownerRepo: string): Promise<PhaseDoc[]> {
    let out: string;
    try {
      out = await this.call(['api', `repos/${ownerRepo}/contents/${PHASES_DIR}`]);
    } catch (err) {
      // No `.midnite/phases/` dir yet is the common first-run case — empty, not error.
      if (err instanceof NotFoundError) return [];
      throw err;
    }
    const parsed = JSON.parse(out) as GhContentEntry[] | GhContentEntry;
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    return entries
      .filter((e) => e.type === 'file' && e.name.endsWith('.md'))
      .map((e) => ({ name: e.name, path: e.path, sha: e.sha, content: '' }));
  }

  async get(ownerRepo: string, filename: string): Promise<PhaseDoc> {
    const out = await this.call(['api', `repos/${ownerRepo}/contents/${PHASES_DIR}/${filename}`]);
    const entry = JSON.parse(out) as GhContentEntry;
    return {
      name: entry.name,
      path: entry.path,
      sha: entry.sha,
      content: decodeContent(entry),
    };
  }

  async create(ownerRepo: string, name: string, content: string): Promise<PhaseDoc> {
    const filename = phaseDocFilename(name);
    return this.put(ownerRepo, filename, content, undefined, `docs(phase): add ${filename}`);
  }

  async update(
    ownerRepo: string,
    filename: string,
    content: string,
    sha: string,
  ): Promise<PhaseDoc> {
    return this.put(ownerRepo, filename, content, sha, `docs(phase): update ${filename}`);
  }

  async delete(ownerRepo: string, filename: string, sha: string): Promise<void> {
    await this.call(
      ['api', '--method', 'DELETE', `repos/${ownerRepo}/contents/${PHASES_DIR}/${filename}`],
      { message: `docs(phase): delete ${filename}`, sha },
    );
  }

  /** PUT a file's contents — create (no sha) or update (with sha). */
  private async put(
    ownerRepo: string,
    filename: string,
    content: string,
    sha: string | undefined,
    message: string,
  ): Promise<PhaseDoc> {
    const body: Record<string, string> = {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
    };
    if (sha) body.sha = sha;
    const out = await this.call(
      ['api', '--method', 'PUT', `repos/${ownerRepo}/contents/${PHASES_DIR}/${filename}`],
      body,
    );
    const entry = (JSON.parse(out) as { content: GhContentEntry }).content;
    return { name: entry.name, path: entry.path, sha: entry.sha, content };
  }

  /** Invoke `gh`, mapping common GitHub failures to domain errors. */
  private async call(args: string[], body?: Record<string, string>): Promise<string> {
    try {
      return await this.runGh(args, body);
    } catch (err) {
      throw this.mapGhError(err);
    }
  }

  /**
   * The raw `gh` invocation — a `protected` seam so specs can stub the CLI
   * (mirrors `PrStatusService.ghView`). A write `body` is fed over stdin via
   * `gh api … --input -` so large base64 payloads never hit the OS arg limit.
   */
  protected runGh(args: string[], body?: Record<string, string>): Promise<string> {
    if (!body) {
      return execFileAsync('gh', args, { timeout: GH_TIMEOUT_MS, maxBuffer: MAX_BUFFER }).then(
        (r) => r.stdout,
      );
    }
    return new Promise<string>((resolvePromise, reject) => {
      const child = spawn('gh', [...args, '--input', '-'], { timeout: GH_TIMEOUT_MS });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
      child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolvePromise(stdout);
        else reject(Object.assign(new Error(stderr || `gh exited ${code}`), { stderr }));
      });
      child.stdin.end(JSON.stringify(body));
    });
  }

  private mapGhError(err: unknown): Error {
    const e = err as { stderr?: string; message?: string; code?: unknown };
    const detail = (e.stderr ?? e.message ?? '').toString();
    if (/HTTP 40[09]|sha.+does not match|but expected/i.test(detail)) {
      // 409 (or the 422 GitHub sometimes returns) for a stale SHA on write.
      if (/HTTP 404/i.test(detail) && !/sha/i.test(detail)) return new NotFoundError(detail);
      return new PhaseDocConflictError('phase doc changed on the remote — reload and retry');
    }
    if (/HTTP 404/i.test(detail)) return new NotFoundError(detail);
    this.logger.warn({ err: detail }, 'gh api call failed');
    return new GithubUnavailableError(detail || 'gh api call failed');
  }
}

function decodeContent(entry: GhContentEntry): string {
  if (entry.content === undefined) return '';
  if (entry.encoding === 'base64') {
    // GitHub wraps base64 content at 60 cols with newlines — Buffer ignores them.
    return Buffer.from(entry.content, 'base64').toString('utf8');
  }
  return entry.content;
}

export { NotFoundError as PhaseDocNotFoundError };
