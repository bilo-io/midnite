import { describe, expect, it } from 'vitest';
import type { FastifyRequest } from 'fastify';

import { PlaygroundController } from './playground.controller';

const controller = new PlaygroundController();

function req(overrides: Partial<FastifyRequest>): FastifyRequest {
  return {
    method: 'GET',
    url: '/playground/echo',
    query: {},
    headers: {},
    body: null,
    ...overrides,
  } as unknown as FastifyRequest;
}

describe('PlaygroundController.echo', () => {
  it('reflects method, path, query, headers, and body', () => {
    const res = controller.echo(
      req({
        method: 'POST',
        url: '/playground/echo?debug=1',
        query: { debug: '1' },
        headers: { 'content-type': 'application/json' },
        body: { hello: 'world' },
      }),
    );
    expect(res.method).toBe('POST');
    expect(res.path).toBe('/playground/echo');
    expect(res.query).toEqual({ debug: '1' });
    expect(res.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(res.body).toEqual({ hello: 'world' });
    expect(res.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('uppercases the method and defaults a missing body to null', () => {
    const res = controller.echo(req({ method: 'delete', body: undefined }));
    expect(res.method).toBe('DELETE');
    expect(res.body).toBeNull();
  });
});

describe('PlaygroundController canned data', () => {
  it('returns a counted list of items', () => {
    const res = controller.items();
    expect(res.count).toBe(res.items.length);
    expect(res.items[0]).toMatchObject({ id: 1, title: expect.any(String), url: expect.any(String) });
  });

  it('returns a latest value with a timestamp', () => {
    const res = controller.latest();
    expect(typeof res.value).toBe('number');
    expect(res.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
