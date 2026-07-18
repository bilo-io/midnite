import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyUpdate, watchWaitingWorker } from './service-worker-update';

type Listener = () => void;

function stubServiceWorker(reg: unknown, controller: unknown = {}) {
  const containerListeners = new Map<string, Listener[]>();
  const container = {
    controller,
    getRegistration: vi.fn().mockResolvedValue(reg),
    addEventListener: (type: string, l: Listener) => {
      const arr = containerListeners.get(type) ?? [];
      arr.push(l);
      containerListeners.set(type, arr);
    },
  };
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
  return {
    container,
    fireControllerChange: () => (containerListeners.get('controllerchange') ?? []).forEach((l) => l()),
  };
}

afterEach(() => {
  // @ts-expect-error — drop the stub between tests.
  delete navigator.serviceWorker;
  vi.restoreAllMocks();
});

describe('applyUpdate', () => {
  it('messages the waiting worker and reloads on controllerchange', async () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload } as unknown as Location);
    const postMessage = vi.fn();
    const { fireControllerChange } = stubServiceWorker({ waiting: { postMessage } });

    await applyUpdate();

    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).not.toHaveBeenCalled();
    fireControllerChange();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('hard-reloads when there is no waiting worker', async () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload } as unknown as Location);
    stubServiceWorker({ waiting: null });

    await applyUpdate();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('hard-reloads when service workers are unavailable', async () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload } as unknown as Location);
    await applyUpdate();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('watchWaitingWorker', () => {
  it('fires immediately when a worker is already waiting', async () => {
    const onWaiting = vi.fn();
    stubServiceWorker({ waiting: {}, addEventListener: vi.fn() });
    watchWaitingWorker(onWaiting);
    await vi.waitFor(() => expect(onWaiting).toHaveBeenCalled());
  });

  it('is a no-op when service workers are unavailable', () => {
    const onWaiting = vi.fn();
    const cleanup = watchWaitingWorker(onWaiting);
    cleanup();
    expect(onWaiting).not.toHaveBeenCalled();
  });
});
