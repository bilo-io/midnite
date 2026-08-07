import { describe, expect, it } from 'vitest';
import { publicClientIp } from './client-ip';

describe('publicClientIp', () => {
  it('returns the caller address when it is a routable public IP', () => {
    expect(publicClientIp(undefined, '203.0.113.7')).toBe('203.0.113.7');
  });

  it('prefers the first hop of x-forwarded-for over the socket address', () => {
    // Behind a proxy the socket address is the proxy; the original client is the
    // left-most entry of the chain.
    expect(publicClientIp('203.0.113.7, 70.41.3.18, 150.172.238.178', '10.0.0.1')).toBe('203.0.113.7');
  });

  it('skips private hops in x-forwarded-for and takes the first public one', () => {
    expect(publicClientIp('192.168.1.10, 203.0.113.7', '10.0.0.1')).toBe('203.0.113.7');
  });

  // The local-gateway case the issue is actually about: desktop and `midnite serve`
  // are reached over loopback, so there is no client IP worth geo-locating and the
  // caller must fall back to the gateway's own egress IP.
  it.each([
    ['loopback v4', '127.0.0.1'],
    ['loopback v6', '::1'],
    ['v4-mapped loopback', '::ffff:127.0.0.1'],
    ['private 10/8', '10.1.2.3'],
    ['private 172.16/12', '172.20.0.5'],
    ['private 192.168/16', '192.168.1.20'],
    ['carrier-grade NAT', '100.64.0.1'],
    ['link-local v4', '169.254.1.1'],
    ['link-local v6', 'fe80::1'],
    ['unique-local v6', 'fd00::1'],
    ['unspecified', '0.0.0.0'],
  ])('returns null for %s', (_label, address) => {
    expect(publicClientIp(undefined, address)).toBeNull();
  });

  it('unwraps v4-mapped v6 addresses', () => {
    expect(publicClientIp(undefined, '::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('strips a port from a forwarded v4 address', () => {
    expect(publicClientIp('203.0.113.7:41234', undefined)).toBe('203.0.113.7');
  });

  it('strips brackets from a forwarded v6 address', () => {
    expect(publicClientIp('[2001:db8::1]:8443', undefined)).toBe('2001:db8::1');
  });

  it('returns null for absent or unparseable input', () => {
    expect(publicClientIp(undefined, undefined)).toBeNull();
    expect(publicClientIp('', '')).toBeNull();
    expect(publicClientIp('not-an-ip', 'also-not-an-ip')).toBeNull();
  });
});
