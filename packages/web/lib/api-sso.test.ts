import { describe, expect, it } from 'vitest';
import { ssoErrorMessage, ssoStartUrl } from './api';

describe('ssoStartUrl', () => {
  it('builds a gateway start URL with an encoded redirect', () => {
    const url = ssoStartUrl('google', '/board');
    expect(url).toContain('/auth/sso/google/start');
    expect(url).toContain('redirect=%2Fboard');
  });

  it('omits the query when no redirect is given', () => {
    expect(ssoStartUrl('github')).toMatch(/\/auth\/sso\/github\/start$/);
  });
});

describe('ssoErrorMessage', () => {
  it('maps known codes to friendly copy', () => {
    expect(ssoErrorMessage('email_conflict')).toMatch(/already/i);
    expect(ssoErrorMessage('signup_closed')).toMatch(/closed/i);
    expect(ssoErrorMessage('access_denied')).toMatch(/cancelled/i);
  });

  it('falls back for an unknown code and returns null for none', () => {
    expect(ssoErrorMessage('weird_code')).toBe('Sign-in failed. Please try again.');
    expect(ssoErrorMessage(null)).toBeNull();
    expect(ssoErrorMessage(undefined)).toBeNull();
  });
});
