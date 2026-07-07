import { describe, expect, it, vi } from 'vitest';
import { SECURITY_HEADERS, applySecurityHeaders } from './security-headers';

describe('security headers', () => {
  it('sets the three cheap, behavior-safe defaults', () => {
    expect(SECURITY_HEADERS).toEqual({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'no-referrer',
    });
  });

  it('deliberately omits CSP and HSTS (tracked as findings, not quick wins)', () => {
    expect(SECURITY_HEADERS).not.toHaveProperty('Content-Security-Policy');
    expect(SECURITY_HEADERS).not.toHaveProperty('Strict-Transport-Security');
  });

  it('applies every header to a reply', () => {
    const header = vi.fn();
    applySecurityHeaders({ header });
    expect(header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(header).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
    expect(header).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');
    expect(header).toHaveBeenCalledTimes(3);
  });
});
