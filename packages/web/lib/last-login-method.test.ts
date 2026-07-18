import { afterEach, describe, expect, it } from 'vitest';

import {
  LAST_LOGIN_METHOD_KEY,
  readLastLoginMethod,
  writeLastLoginMethod,
} from './last-login-method';

afterEach(() => window.localStorage.clear());

describe('last-login-method', () => {
  it('round-trips each method through localStorage', () => {
    for (const method of ['google', 'github', 'email'] as const) {
      writeLastLoginMethod(method);
      expect(readLastLoginMethod()).toBe(method);
    }
  });

  it('reads null when nothing was stored', () => {
    expect(readLastLoginMethod()).toBeNull();
  });

  it('rejects an unknown stored value instead of returning garbage', () => {
    window.localStorage.setItem(LAST_LOGIN_METHOD_KEY, 'facebook');
    expect(readLastLoginMethod()).toBeNull();
  });
});
