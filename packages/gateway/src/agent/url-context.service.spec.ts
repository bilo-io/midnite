import { afterEach, describe, expect, it, vi } from 'vitest';
import { UrlContextService } from './url-context.service';

type Issue = { title: string; body: string | null; state: string };

// Subclass exposing seams for the network primitives so we exercise enrich()'s
// orchestration (detect → dispatch → build → fail-open) without real I/O.
class TestUrlContextService extends UrlContextService {
  ghApiResult: Issue | null = null;
  ghRestResult: Issue | null = null;
  ghApiCalls = 0;
  ghRestCalls = 0;

  protected override async ghApi(): Promise<Issue | null> {
    this.ghApiCalls++;
    return this.ghApiResult;
  }
  protected override async ghRest(): Promise<Issue | null> {
    this.ghRestCalls++;
    return this.ghRestResult;
  }
}

afterEach(() => vi.unstubAllGlobals());

describe('UrlContextService.enrich', () => {
  it('returns the prompt unchanged when there are no URLs', async () => {
    const svc = new TestUrlContextService();
    expect(await svc.enrich('just do the thing')).toBe('just do the thing');
  });

  it('appends GitHub issue/PR context fetched via gh', async () => {
    const svc = new TestUrlContextService();
    svc.ghApiResult = { title: 'Login is broken', body: 'steps to repro', state: 'open' };

    const out = await svc.enrich('fix https://github.com/o/r/issues/12 please');

    expect(svc.ghApiCalls).toBe(1);
    expect(svc.ghRestCalls).toBe(0); // gh succeeded → no REST fallback
    expect(out).toContain('## Linked context');
    expect(out).toContain('### o/r#12: Login is broken');
    expect(out).toContain('State: open');
    expect(out).toContain('steps to repro');
  });

  it('falls back to the anonymous REST API when gh returns nothing', async () => {
    const svc = new TestUrlContextService();
    svc.ghApiResult = null;
    svc.ghRestResult = { title: 'Public bug', body: null, state: 'closed' };

    const out = await svc.enrich('see https://github.com/o/r/pull/3');

    expect(svc.ghApiCalls).toBe(1);
    expect(svc.ghRestCalls).toBe(1);
    expect(out).toContain('o/r#3: Public bug');
    expect(out).toContain('(no description)');
  });

  it('leaves the prompt unchanged when a GitHub link resolves to nothing (fail-open)', async () => {
    const svc = new TestUrlContextService();
    svc.ghApiResult = null;
    svc.ghRestResult = null;
    const prompt = 'check https://github.com/o/r/issues/99';
    expect(await svc.enrich(prompt)).toBe(prompt);
  });

  it('fetches a general URL through the SSRF guard and extracts readable text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html><head><title>Spec Page</title></head><body><p>Body text here</p></body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })),
    );
    const svc = new TestUrlContextService();
    const out = await svc.enrich('read https://example.com/article');
    expect(out).toContain('### Spec Page');
    expect(out).toContain('Body text here');
  });

  it('never fetches a private/loopback URL (SSRF guard) and stays fail-open', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const svc = new TestUrlContextService();
    const prompt = 'hit http://192.168.0.1/admin and http://localhost:7777/x';
    expect(await svc.enrich(prompt)).toBe(prompt);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
