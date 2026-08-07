import { describe, expect, it, vi } from 'vitest';
import { decidePermission } from './permissions';

const APP = 'http://localhost:7777';

describe('decidePermission', () => {
  // The weather widget's whole point: without this, Chromium never even asks
  // the OS and getCurrentPosition dead-ends in POSITION_UNAVAILABLE.
  it('grants geolocation to the app origin', () => {
    expect(decidePermission(APP, 'geolocation', `${APP}/`)).toBe(true);
  });

  it('grants notifications to the app origin (the existing native-notification bridge)', () => {
    expect(decidePermission(APP, 'notifications', `${APP}/dashboard`)).toBe(true);
  });

  // The app never navigates away from its own origin, so anything else asking is
  // not the app — default closed rather than inheriting Electron's grant-all.
  it('denies geolocation to any other origin', () => {
    expect(decidePermission(APP, 'geolocation', 'https://evil.example/')).toBe(false);
  });

  it('denies permissions the app has no use for, even from its own origin', () => {
    expect(decidePermission(APP, 'media', `${APP}/`)).toBe(false);
    expect(decidePermission(APP, 'midi', `${APP}/`)).toBe(false);
  });

  it('denies when the requesting URL is missing or unparseable', () => {
    expect(decidePermission(APP, 'geolocation', undefined)).toBe(false);
    expect(decidePermission(APP, 'geolocation', 'not-a-url')).toBe(false);
  });

  it('matches on origin, not on a string prefix', () => {
    // `http://localhost:77771` starts with the app URL but is a different origin.
    expect(decidePermission(APP, 'geolocation', 'http://localhost:77771/')).toBe(false);
  });
});

describe('registerPermissionHandlers', () => {
  it('wires both the prompting and the synchronous check handler', async () => {
    const session = {
      setPermissionRequestHandler: vi.fn(),
      setPermissionCheckHandler: vi.fn(),
    };
    const { registerPermissionHandlers } = await import('./permissions');
    registerPermissionHandlers(session as never, APP);

    expect(session.setPermissionRequestHandler).toHaveBeenCalledOnce();
    expect(session.setPermissionCheckHandler).toHaveBeenCalledOnce();

    // The request handler answers through a callback; the check handler returns.
    const request = session.setPermissionRequestHandler.mock.calls[0]?.[0] as (
      wc: unknown,
      p: string,
      cb: (granted: boolean) => void,
      details: { requestingUrl?: string },
    ) => void;
    const granted = vi.fn();
    request(null, 'geolocation', granted, { requestingUrl: `${APP}/` });
    expect(granted).toHaveBeenCalledWith(true);

    const check = session.setPermissionCheckHandler.mock.calls[0]?.[0] as (
      wc: unknown,
      p: string,
      origin: string,
    ) => boolean;
    expect(check(null, 'geolocation', APP)).toBe(true);
    expect(check(null, 'geolocation', 'https://evil.example')).toBe(false);
  });
});
