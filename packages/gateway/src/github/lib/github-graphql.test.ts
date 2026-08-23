import { describe, expect, it, vi } from 'vitest';

import { GithubApiError } from './github-rest';
import { githubGraphQl, isMissingScopeError, isNotFoundError } from './github-graphql';

// The whole reason this isn't folded into `github-rest.ts`: GitHub answers a FAILED
// GraphQL query with **HTTP 200** and an `errors[]` array. A client that checks `res.ok`
// — exactly what the REST helper correctly does — treats a permission denial as success
// and hands the caller a `data` full of nulls.

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const fetchOf = (...responses: Response[]) => {
  let i = 0;
  return vi.fn(async () => responses[Math.min(i++, responses.length - 1)]!) as unknown as typeof fetch;
};

describe('githubGraphQl', () => {
  it('returns data on a clean response', async () => {
    const result = await githubGraphQl<{ viewer: { login: string } }>(
      'query { viewer { login } }',
      {},
      'token',
      { fetchImpl: fetchOf(json({ data: { viewer: { login: 'octo' } } })) },
    );
    expect(result.data.viewer.login).toBe('octo');
  });

  it('throws on a 200 that carries errors[] — the case res.ok cannot see', async () => {
    const impl = fetchOf(json({ data: null, errors: [{ message: 'Could not resolve to a node' }] }));
    await expect(
      githubGraphQl('query {}', {}, 'token', { fetchImpl: impl }),
    ).rejects.toThrow('Could not resolve to a node');
  });

  it('reports the error `type`, which is how GitHub signals a missing scope', async () => {
    const impl = fetchOf(
      json({ errors: [{ message: 'Resource not accessible', type: 'INSUFFICIENT_SCOPES' }] }),
    );
    const err = await githubGraphQl('query {}', {}, 't', { fetchImpl: impl }).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(err?.message).toContain('INSUFFICIENT_SCOPES');
    expect(isMissingScopeError(err)).toBe(true);
  });

  it('joins several errors rather than reporting only the first', async () => {
    const impl = fetchOf(json({ errors: [{ message: 'one' }, { message: 'two' }] }));
    const err = await githubGraphQl('query {}', {}, 't', { fetchImpl: impl }).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(err?.message).toContain('one');
    expect(err?.message).toContain('two');
  });

  it('surfaces the rate limit when the document asked for it', async () => {
    const impl = fetchOf(
      json({ data: { rateLimit: { remaining: 4321, resetAt: '2026-08-22T15:00:00Z' } } }),
    );
    const result = await githubGraphQl('query {}', {}, 't', { fetchImpl: impl });
    expect(result.rateLimit).toEqual({ remaining: 4321, resetAt: '2026-08-22T15:00:00Z' });
  });

  it('omits the rate limit rather than inventing one when absent', async () => {
    const impl = fetchOf(json({ data: { viewer: null } }));
    expect((await githubGraphQl('query {}', {}, 't', { fetchImpl: impl })).rateLimit).toBeUndefined();
  });

  it('throws on a non-2xx, carrying the status', async () => {
    const impl = fetchOf(json({ message: 'Bad credentials' }, 401));
    const err = await githubGraphQl('query {}', {}, 't', { fetchImpl: impl }).catch((e) => e);
    expect(err).toBeInstanceOf(GithubApiError);
    expect((err as GithubApiError).status).toBe(401);
    expect((err as Error).message).toContain('Bad credentials');
  });

  it('treats neither-data-nor-errors as a failure, not a null to dereference', async () => {
    const impl = fetchOf(json({}));
    await expect(githubGraphQl('query {}', {}, 't', { fetchImpl: impl })).rejects.toThrow(
      /neither data nor errors/,
    );
  });

  it('wraps a transport failure with status 0', async () => {
    const exploding = vi.fn(async () => {
      throw new Error('ECONNRESET');
    }) as unknown as typeof fetch;
    const err = await githubGraphQl('query {}', {}, 't', { fetchImpl: exploding }).catch((e) => e);
    expect(err).toBeInstanceOf(GithubApiError);
    expect((err as GithubApiError).status).toBe(0);
  });

  it('rejects a non-JSON body rather than throwing an opaque parse error', async () => {
    const impl = fetchOf(new Response('<html>502</html>', { status: 200 }));
    await expect(githubGraphQl('query {}', {}, 't', { fetchImpl: impl })).rejects.toThrow(
      /non-JSON body/,
    );
  });

  it('sends the document, variables and bearer token', async () => {
    const impl = fetchOf(json({ data: {} }));
    await githubGraphQl('query Q($a: Int!) { x }', { a: 1 }, 'gho_secret', { fetchImpl: impl });

    const [url, init] = vi.mocked(impl).mock.calls[0]!;
    expect(String(url)).toBe('https://api.github.com/graphql');
    const headers = init?.headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer gho_secret');
    expect(JSON.parse(String(init?.body))).toEqual({
      query: 'query Q($a: Int!) { x }',
      variables: { a: 1 },
    });
  });
});

describe('error classification', () => {
  it.each([
    ['INSUFFICIENT_SCOPES', true],
    ['Resource not accessible by personal access token', true],
    ['Could not resolve to a ProjectV2 with the global id', false],
  ])('classifies %s as missing-scope=%s', (message, expected) => {
    expect(isMissingScopeError(new GithubApiError(message, 200))).toBe(expected);
  });

  it('does not classify a non-GithubApiError', () => {
    expect(isMissingScopeError(new Error('INSUFFICIENT_SCOPES'))).toBe(false);
    expect(isNotFoundError(new Error('NOT_FOUND'))).toBe(false);
  });

  it('recognises NOT_FOUND', () => {
    expect(isNotFoundError(new GithubApiError('GitHub GraphQL error: x [NOT_FOUND]', 200))).toBe(true);
  });
});
