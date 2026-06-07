import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './allowed-origin';

describe('isAllowedOrigin', () => {
  it('allows requests with no Origin (CLI / server-to-server / non-browser WS)', () => {
    expect(isAllowedOrigin(undefined, [])).toBe(true);
    expect(isAllowedOrigin(null, [])).toBe(true);
    expect(isAllowedOrigin('', [])).toBe(true);
  });

  it('allows loopback origins on any port', () => {
    expect(isAllowedOrigin('http://localhost:3000', [])).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:7777', [])).toBe(true);
    expect(isAllowedOrigin('http://[::1]:3000', [])).toBe(true);
  });

  it('blocks non-loopback origins (drive-by RCE vector)', () => {
    expect(isAllowedOrigin('https://evil.com', [])).toBe(false);
    expect(isAllowedOrigin('http://192.168.1.50:3000', [])).toBe(false);
    expect(isAllowedOrigin('http://localhost.evil.com', [])).toBe(false);
  });

  it('honors the explicit allowlist', () => {
    expect(isAllowedOrigin('https://midnite.example.com', ['https://midnite.example.com'])).toBe(
      true,
    );
    expect(isAllowedOrigin('https://other.com', ['https://midnite.example.com'])).toBe(false);
  });

  it('rejects unparseable origins', () => {
    expect(isAllowedOrigin('not a url', [])).toBe(false);
  });
});
