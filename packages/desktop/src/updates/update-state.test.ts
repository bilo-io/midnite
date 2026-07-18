import { describe, expect, it } from 'vitest';

import {
  availableState,
  checkingState,
  downloadedState,
  downloadingState,
  errorState,
  IDLE_STATE,
  notAvailableState,
  UPDATE_CHECK_CHANNEL,
  UPDATE_DOWNLOAD_CHANNEL,
  UPDATE_RESTART_CHANNEL,
  UPDATE_STATE_CHANNEL,
} from './update-state';

describe('update-state mappers', () => {
  it('checking → phase checking, no version/percent/error', () => {
    expect(checkingState()).toEqual({ phase: 'checking', version: null, percent: null, error: null });
  });

  it('available → carries the version', () => {
    expect(availableState({ version: '0.2.0' })).toEqual({
      phase: 'available',
      version: '0.2.0',
      percent: null,
      error: null,
    });
  });

  it('available → null version when the info omits it', () => {
    expect(availableState({}).version).toBeNull();
  });

  it('not-available folds back to idle so the banner hides', () => {
    expect(notAvailableState()).toEqual(IDLE_STATE);
  });

  it('downloading → rounds + clamps percent and threads the known version', () => {
    expect(downloadingState({ percent: 42.7 }, '0.2.0')).toEqual({
      phase: 'downloading',
      version: '0.2.0',
      percent: 43,
      error: null,
    });
    expect(downloadingState({ percent: 150 }, null).percent).toBe(100);
    expect(downloadingState({ percent: -5 }, null).percent).toBe(0);
    expect(downloadingState({}, null).percent).toBe(0);
  });

  it('downloaded → percent 100 + version', () => {
    expect(downloadedState({ version: '0.2.0' })).toEqual({
      phase: 'downloaded',
      version: '0.2.0',
      percent: 100,
      error: null,
    });
  });

  it('error → message from an Error, keeps the last version', () => {
    expect(errorState(new Error('feed unreachable'), '0.1.9')).toEqual({
      phase: 'error',
      version: '0.1.9',
      percent: null,
      error: 'feed unreachable',
    });
  });

  it('error → stringifies a non-Error value', () => {
    expect(errorState('boom', null).error).toBe('boom');
  });
});

describe('update-state channels', () => {
  it('are distinct and namespaced', () => {
    const channels = [
      UPDATE_STATE_CHANNEL,
      UPDATE_CHECK_CHANNEL,
      UPDATE_DOWNLOAD_CHANNEL,
      UPDATE_RESTART_CHANNEL,
    ];
    expect(new Set(channels).size).toBe(channels.length);
    for (const c of channels) expect(c.startsWith('midnite:update')).toBe(true);
  });
});
