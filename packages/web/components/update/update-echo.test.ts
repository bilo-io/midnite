import { describe, expect, it } from 'vitest';

import { shouldEchoUpdate } from './update-echo';

describe('shouldEchoUpdate', () => {
  it('echoes when an update is available for a not-yet-echoed version', () => {
    expect(shouldEchoUpdate(true, '0.2.0', null)).toBe(true);
    expect(shouldEchoUpdate(true, '0.2.0', '0.1.0')).toBe(true);
  });

  it('does not echo the same version twice', () => {
    expect(shouldEchoUpdate(true, '0.2.0', '0.2.0')).toBe(false);
  });

  it('does not echo when no update is available', () => {
    expect(shouldEchoUpdate(false, '0.2.0', null)).toBe(false);
  });

  it('does not echo before the version is known', () => {
    expect(shouldEchoUpdate(true, null, null)).toBe(false);
  });
});
