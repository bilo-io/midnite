import { describe, expect, it } from 'vitest';
import { parseConfig } from '@midnite/shared';

import { isGatewaySelfOrigin } from './self-origin';

const config = parseConfig({
  agent: {},
  terminal: {},
  gateway: {},
  workflows: { webhookBaseUrl: 'http://localhost:7777' },
});

describe('isGatewaySelfOrigin', () => {
  it('matches the configured gateway origin regardless of path or query', () => {
    expect(isGatewaySelfOrigin('http://localhost:7777/playground/echo', config)).toBe(true);
    expect(isGatewaySelfOrigin('http://localhost:7777/tasks?x=1', config)).toBe(true);
  });

  it('rejects a different port, host, or scheme', () => {
    expect(isGatewaySelfOrigin('http://localhost:9999/x', config)).toBe(false);
    expect(isGatewaySelfOrigin('http://example.com/x', config)).toBe(false);
    expect(isGatewaySelfOrigin('https://localhost:7777/x', config)).toBe(false);
  });

  it('rejects an unparseable URL', () => {
    expect(isGatewaySelfOrigin('not a url', config)).toBe(false);
  });
});
