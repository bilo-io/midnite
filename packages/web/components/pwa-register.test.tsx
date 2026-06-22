import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { PwaRegister } from './pwa-register';

const register = vi.fn().mockResolvedValue({});

function stubServiceWorker() {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register },
    configurable: true,
  });
}

describe('PwaRegister', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    register.mockClear();
    // @ts-expect-error — remove the stubbed property between tests.
    delete navigator.serviceWorker;
  });

  it('registers the service worker in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    stubServiceWorker();
    render(<PwaRegister />);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('does not register outside production (avoids fighting the dev server)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    stubServiceWorker();
    render(<PwaRegister />);
    expect(register).not.toHaveBeenCalled();
  });
});
