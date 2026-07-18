import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import type { UpdateState, UpdatesBridge } from '@/lib/desktop-bridge';

import { UpdateProvider, useUpdate } from './update-provider';

// The provider composes the version poll + SW signal (browser) OR the
// electron-updater bridge (desktop). Stub the browser detectors so the test only
// exercises the desktop branch driven by window.midnite.updates.
vi.mock('@/hooks/use-version-poll', () => ({
  VERSION_POLL_INTERVAL_MS: 300000,
  useVersionPoll: () => ({ available: false, belowFloor: false, latest: null, manifest: null }),
}));
vi.mock('@/lib/service-worker-update', () => ({
  applyUpdate: vi.fn(),
  checkForWaitingWorker: vi.fn().mockResolvedValue(undefined),
  watchWaitingWorker: () => () => {},
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

afterEach(() => {
  cleanup();
  delete (window as unknown as { midnite?: unknown }).midnite;
  vi.clearAllMocks();
});

/** Renders the context value as data-attributes + drives applyUpdate on click. */
function Probe() {
  const u = useUpdate();
  return (
    <button
      type="button"
      data-available={u.available}
      data-phase={u.desktopPhase ?? 'none'}
      data-latest={u.latest ?? 'none'}
      data-percent={u.downloadPercent ?? 'none'}
      onClick={u.applyUpdate}
    >
      probe
    </button>
  );
}

/** A controllable fake of the preload's window.midnite.updates bridge. */
function installBridge(): {
  bridge: UpdatesBridge;
  emit: (state: UpdateState) => void;
  check: ReturnType<typeof vi.fn>;
  download: ReturnType<typeof vi.fn>;
  restartToInstall: ReturnType<typeof vi.fn>;
} {
  let handler: ((s: UpdateState) => void) | null = null;
  const check = vi.fn();
  const download = vi.fn();
  const restartToInstall = vi.fn();
  const bridge: UpdatesBridge = {
    onState: (h) => {
      handler = h;
      return () => {
        handler = null;
      };
    },
    check,
    download,
    restartToInstall,
  };
  (window as unknown as { midnite: { updates: UpdatesBridge } }).midnite = { updates: bridge };
  return {
    bridge,
    emit: (state) => act(() => handler?.(state)),
    check,
    download,
    restartToInstall,
  };
}

describe('UpdateProvider — desktop (electron-updater) branch', () => {
  it('checks on mount and stays hidden while idle', () => {
    const h = installBridge();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    expect(h.check).toHaveBeenCalled();
    const btn = screen.getByRole('button', { name: 'probe' });
    expect(btn).toHaveAttribute('data-available', 'false');
    expect(btn).toHaveAttribute('data-phase', 'idle');
  });

  it('flips available + carries the version when the feed reports one', () => {
    const h = installBridge();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    h.emit({ phase: 'available', version: '0.2.0', percent: null, error: null });
    const btn = screen.getByRole('button', { name: 'probe' });
    expect(btn).toHaveAttribute('data-available', 'true');
    expect(btn).toHaveAttribute('data-latest', '0.2.0');
  });

  it('surfaces download progress', () => {
    const h = installBridge();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    h.emit({ phase: 'downloading', version: '0.2.0', percent: 55, error: null });
    expect(screen.getByRole('button', { name: 'probe' })).toHaveAttribute('data-percent', '55');
  });

  it('routes applyUpdate to download when available, restart when downloaded', () => {
    const h = installBridge();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    const btn = screen.getByRole('button', { name: 'probe' });

    h.emit({ phase: 'available', version: '0.2.0', percent: null, error: null });
    act(() => btn.click());
    expect(h.download).toHaveBeenCalledOnce();

    h.emit({ phase: 'downloaded', version: '0.2.0', percent: 100, error: null });
    act(() => btn.click());
    expect(h.restartToInstall).toHaveBeenCalledOnce();
  });

  it('re-checks (retries) on applyUpdate after an error', () => {
    const h = installBridge();
    render(
      <UpdateProvider>
        <Probe />
      </UpdateProvider>,
    );
    h.check.mockClear();
    h.emit({ phase: 'error', version: '0.2.0', percent: null, error: 'feed unreachable' });
    act(() => screen.getByRole('button', { name: 'probe' }).click());
    expect(h.check).toHaveBeenCalledOnce();
    expect(h.download).not.toHaveBeenCalled();
  });
});
