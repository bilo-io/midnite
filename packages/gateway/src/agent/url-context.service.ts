import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseGithubIssueOrPr } from '@midnite/shared';
import { isSafeHttpUrl, parseHtmlMetadata, readCapped } from '../projects/lib/opengraph';
import {
  buildContextBlock,
  extractUrls,
  htmlToText,
  truncate,
  type FetchedContext,
} from './lib/url-context';

const execFileAsync = promisify(execFile);

const FETCH_TIMEOUT_MS = 5000;
const GH_TIMEOUT_MS = 5000;
const MAX_FETCH_BYTES = 512 * 1024;
const USER_AGENT =
  'Mozilla/5.0 (compatible; midnite-context/1.0; +https://github.com/bilo-io/midnite)';

/** The fields we lift from a GitHub issue/PR (the REST issues endpoint serves both). */
type GithubIssue = { title: string; body: string | null; state: string };

/**
 * Phase 15 Theme B — fold context fetched from a task's links into its execution
 * prompt. GitHub issue/PR links resolve via `gh` (the user's auth, so private
 * repos work) with an anonymous `api.github.com` fallback; other links are fetched
 * through the existing SSRF guard and reduced to readable text. Everything is
 * best-effort and **fail-open**: any fetch error is logged and skipped, never
 * breaking the agent run. Detection/formatting are the pure helpers in `lib/`.
 */
@Injectable()
export class UrlContextService {
  private readonly logger = new Logger(UrlContextService.name);

  /**
   * Return `prompt` with a "Linked context" block appended for any URLs it
   * contains, or unchanged when there are none / nothing resolved.
   */
  async enrich(prompt: string): Promise<string> {
    const urls = extractUrls(prompt);
    if (urls.length === 0) return prompt;

    const fetched = await Promise.all(urls.map((url) => this.fetchOne(url)));
    const contexts = fetched.filter((c): c is FetchedContext => c !== null);
    const block = buildContextBlock(contexts);
    if (!block) return prompt;

    this.logger.log(`enriched prompt with ${contexts.length}/${urls.length} linked source(s)`);
    return prompt + block;
  }

  /** Fetch one URL's context (GitHub-aware), fail-open to null. */
  private async fetchOne(url: string): Promise<FetchedContext | null> {
    try {
      const gh = parseGithubIssueOrPr(url);
      return gh ? await this.fetchGithub(url, gh.repo, gh.number) : await this.fetchGeneral(url);
    } catch (err) {
      this.logger.warn(
        `url-context: skipping ${url}: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
      return null;
    }
  }

  private async fetchGithub(
    url: string,
    repo: string,
    number: number,
  ): Promise<FetchedContext | null> {
    const issue = (await this.ghApi(repo, number)) ?? (await this.ghRest(repo, number));
    if (!issue) return null;
    const body = truncate(`State: ${issue.state}\n\n${issue.body?.trim() || '(no description)'}`);
    return { url, title: `${repo}#${number}: ${issue.title}`, body };
  }

  private async fetchGeneral(url: string): Promise<FetchedContext | null> {
    if (!isSafeHttpUrl(url)) return null;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,text/plain' },
    });
    if (!res.ok) return null;
    const raw = await readCapped(res, MAX_FETCH_BYTES);
    const isHtml = (res.headers.get('content-type') ?? '').includes('html');
    const title = isHtml ? parseHtmlMetadata(raw, res.url || url).title : undefined;
    const text = isHtml ? htmlToText(raw) : raw.trim();
    if (!text) return null;
    return { url, title, body: truncate(text) };
  }

  // ---- network primitives (protected so the orchestration is unit-testable) ----

  /** Resolve a GitHub issue/PR via the `gh` CLI (uses the user's auth). null on any failure. */
  protected async ghApi(repo: string, number: number): Promise<GithubIssue | null> {
    try {
      const { stdout } = await execFileAsync('gh', ['api', `repos/${repo}/issues/${number}`], {
        timeout: GH_TIMEOUT_MS,
        maxBuffer: MAX_FETCH_BYTES,
      });
      return this.parseIssue(stdout);
    } catch {
      return null;
    }
  }

  /** Anonymous fallback for public issues/PRs when `gh` is absent or errors. */
  protected async ghRest(repo: string, number: number): Promise<GithubIssue | null> {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/issues/${number}`, {
        signal: AbortSignal.timeout(GH_TIMEOUT_MS),
        headers: { 'user-agent': USER_AGENT, accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return null;
      return this.parseIssue(await res.text());
    } catch {
      return null;
    }
  }

  private parseIssue(json: string): GithubIssue | null {
    const data = JSON.parse(json) as Partial<GithubIssue>;
    if (typeof data.title !== 'string') return null;
    return { title: data.title, body: data.body ?? null, state: data.state ?? 'unknown' };
  }
}
