import { describe, expect, it } from 'vitest';

import { feedChannelFor } from './feed-channel';

// Regression cover for the bug that hid the desktop update banner on every
// packaged build: our channel name (`stable`) was assigned straight to
// `autoUpdater.channel`, which made electron-updater fetch `stable-mac.yml` —
// an asset electron-builder never publishes (it emits `latest-mac.yml`). The 404
// became an `error` state with no version, which the banner hides by design.

describe('feedChannelFor', () => {
  it('maps stable onto the published `latest` feed, never a `stable-*.yml`', () => {
    expect(feedChannelFor('stable').channel).toBe('latest');
  });

  it('keeps stable off prereleases and off downgrades', () => {
    expect(feedChannelFor('stable')).toEqual({
      channel: 'latest',
      allowPrerelease: false,
      allowDowngrade: false,
    });
  });

  it('maps beta onto the beta feed with the latest-yml fallback enabled', () => {
    expect(feedChannelFor('beta')).toEqual({
      channel: 'beta',
      allowPrerelease: true,
      allowDowngrade: true,
    });
  });

  it('always yields a string channel, so switching back never clears it', () => {
    // electron-updater's `channel` setter throws when handed a non-string after a
    // previous string value, so beta → stable must pass 'latest', not null.
    for (const channel of ['stable', 'beta'] as const) {
      expect(typeof feedChannelFor(channel).channel).toBe('string');
    }
  });
});
