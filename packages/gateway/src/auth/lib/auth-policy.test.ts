import { describe, expect, it } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import {
  bearerTokenFromHeader,
  isAuthExemptPath,
  isLoopbackHost,
  isPublicInboundReceiver,
  isValidBearer,
  resolveAuthToken,
  safeEqual,
} from './auth-policy';

function configWith(authOverrides: Record<string, unknown> = {}): MidniteConfig {
  return parseConfig({ agent: {}, terminal: {}, gateway: { auth: authOverrides } });
}

describe('isLoopbackHost', () => {
  it('accepts the loopback block, localhost and ::1', () => {
    for (const h of ['127.0.0.1', '127.0.0.53', 'localhost', 'LOCALHOST', '::1', '[::1]']) {
      expect(isLoopbackHost(h)).toBe(true);
    }
  });

  it('rejects bind-all and routable addresses', () => {
    for (const h of ['0.0.0.0', '::', '192.168.1.10', '10.0.0.2', 'example.com']) {
      expect(isLoopbackHost(h)).toBe(false);
    }
  });
});

describe('resolveAuthToken', () => {
  it('reads the token from the configured env var', () => {
    const config = configWith({ tokenEnv: 'MY_TOKEN' });
    expect(resolveAuthToken(config, { MY_TOKEN: 's3cret' })).toBe('s3cret');
  });

  it('treats unset or blank as no token (auth off)', () => {
    const config = configWith({ tokenEnv: 'MY_TOKEN' });
    expect(resolveAuthToken(config, {})).toBeNull();
    expect(resolveAuthToken(config, { MY_TOKEN: '   ' })).toBeNull();
  });
});

describe('isAuthExemptPath', () => {
  it('exempts health probes and hook callbacks (incl. query strings / trailing slashes)', () => {
    for (const p of [
      '/health',
      '/health?x=1',
      '/health/live',
      '/health/ready',
      '/health/ready/',
      '/hooks/sessions/abc/stop',
      '/hooks/workflows/x',
      '/hooks/',
    ]) {
      expect(isAuthExemptPath(p)).toBe(true);
    }
  });

  it('protects everything else', () => {
    for (const p of ['/tasks', '/healthy', '/hooksy', '/projects?type=x', '/']) {
      expect(isAuthExemptPath(p)).toBe(false);
    }
  });
});

describe('bearerTokenFromHeader', () => {
  it('extracts the token, scheme case-insensitive', () => {
    expect(bearerTokenFromHeader('Bearer abc')).toBe('abc');
    expect(bearerTokenFromHeader('bearer  abc ')).toBe('abc');
  });

  it('returns null for missing or non-bearer headers', () => {
    expect(bearerTokenFromHeader(undefined)).toBeNull();
    expect(bearerTokenFromHeader('Basic abc')).toBeNull();
    expect(bearerTokenFromHeader('Bearer')).toBeNull();
  });
});

describe('safeEqual', () => {
  it('matches equal strings and rejects mismatches / length diffs', () => {
    expect(safeEqual('token', 'token')).toBe(true);
    expect(safeEqual('token', 'tokeN')).toBe(false);
    expect(safeEqual('token', 'tok')).toBe(false);
  });
});

describe('isPublicInboundReceiver', () => {
  it('exempts only POST to a one-segment /integrations/inbound/:id', () => {
    expect(isPublicInboundReceiver('POST', '/integrations/inbound/abc123')).toBe(true);
    expect(isPublicInboundReceiver('post', '/integrations/inbound/abc123?x=1')).toBe(true);
  });

  it('does NOT exempt the team-admin management routes sharing the prefix', () => {
    expect(isPublicInboundReceiver('POST', '/integrations/inbound')).toBe(false); // create
    expect(isPublicInboundReceiver('POST', '/integrations/inbound/abc/rotate')).toBe(false); // rotate
    expect(isPublicInboundReceiver('PATCH', '/integrations/inbound/abc')).toBe(false); // update
    expect(isPublicInboundReceiver('DELETE', '/integrations/inbound/abc')).toBe(false); // delete
    expect(isPublicInboundReceiver('GET', '/integrations/inbound')).toBe(false); // list
  });
});

describe('isValidBearer', () => {
  it('accepts the matching token, including a duplicated header (first wins)', () => {
    expect(isValidBearer('Bearer s3cret', 's3cret')).toBe(true);
    expect(isValidBearer(['Bearer s3cret', 'Bearer other'], 's3cret')).toBe(true);
  });

  it('rejects missing, wrong, or non-bearer headers', () => {
    expect(isValidBearer(undefined, 's3cret')).toBe(false);
    expect(isValidBearer('Bearer nope', 's3cret')).toBe(false);
    expect(isValidBearer('Basic s3cret', 's3cret')).toBe(false);
  });
});
