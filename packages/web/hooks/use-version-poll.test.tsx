import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import type { VersionManifest } from '@midnite/shared';

import { useVersionPoll } from './use-version-poll';

const { fetchVersionManifest, getCurrentVersion } = vi.hoisted(() => ({
  fetchVersionManifest: vi.fn(),
  getCurrentVersion: vi.fn(),
}));

vi.mock('@/lib/version', () => ({
  VERSION_MANIFEST_PATH: '/version.json',
  versionManifestPath: (channel: string) =>
    channel === 'beta' ? '/version.beta.json' : '/version.json',
  fetchVersionManifest,
  getCurrentVersion,
}));

function manifest(over: Partial<VersionManifest> = {}): VersionManifest {
  return { version: '0.2.0', channel: 'stable', ...over };
}

describe('useVersionPoll', () => {
  beforeEach(() => {
    getCurrentVersion.mockReturnValue('0.1.3');
    fetchVersionManifest.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('reports available when the manifest is a newer build', async () => {
    fetchVersionManifest.mockResolvedValue(manifest());
    const { result } = renderHook(() => useVersionPoll());
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.latest).toBe('0.2.0');
    expect(result.current.belowFloor).toBe(false);
  });

  it('reports not-available when up to date', async () => {
    getCurrentVersion.mockReturnValue('0.2.0');
    fetchVersionManifest.mockResolvedValue(manifest());
    const { result } = renderHook(() => useVersionPoll());
    await waitFor(() => expect(fetchVersionManifest).toHaveBeenCalled());
    expect(result.current.available).toBe(false);
  });

  it('polls the beta manifest when the channel is beta (Phase 71 H)', async () => {
    fetchVersionManifest.mockResolvedValue(manifest());
    renderHook(() => useVersionPoll(undefined, 'beta'));
    await waitFor(() => expect(fetchVersionManifest).toHaveBeenCalledWith('/version.beta.json'));
  });

  it('polls the stable manifest by default', async () => {
    fetchVersionManifest.mockResolvedValue(manifest());
    renderHook(() => useVersionPoll());
    await waitFor(() => expect(fetchVersionManifest).toHaveBeenCalledWith('/version.json'));
  });

  it('flags belowFloor when under minSupported', async () => {
    fetchVersionManifest.mockResolvedValue(manifest({ minSupported: '0.2.0' }));
    const { result } = renderHook(() => useVersionPoll());
    await waitFor(() => expect(result.current.belowFloor).toBe(true));
  });

  it('fails soft on a fetch error (stays idle, never throws)', async () => {
    fetchVersionManifest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useVersionPoll());
    await waitFor(() => expect(fetchVersionManifest).toHaveBeenCalled());
    expect(result.current.available).toBe(false);
    expect(result.current.latest).toBeNull();
  });

  it('re-checks when the poll key (route) changes', async () => {
    fetchVersionManifest.mockResolvedValue(manifest());
    const { rerender } = renderHook(({ k }: { k: string }) => useVersionPoll(k), {
      initialProps: { k: '/a' },
    });
    await waitFor(() => expect(fetchVersionManifest).toHaveBeenCalledTimes(1));
    rerender({ k: '/b' });
    await waitFor(() => expect(fetchVersionManifest).toHaveBeenCalledTimes(2));
  });
});
