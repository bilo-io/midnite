// Maps midnite's release channel onto electron-updater's *feed* channel.
//
// These are two different namespaces and conflating them silently broke desktop
// update detection for every packaged build between Phase 71 Theme H and this fix:
// `autoUpdater.channel = 'stable'` makes `GitHubProvider` look for a
// `stable-mac.yml` (`<channel>` + platform suffix + `.yml`) asset in the newest
// release — a file electron-builder never publishes, because our builds declare no
// `channel:` and therefore always emit `latest-mac.yml` / `latest.yml` /
// `latest-linux.yml`. The 404 surfaced as `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND`,
// which the banner's fail-soft rule (an error with no known version stays hidden)
// then swallowed — so the banner never appeared on desktop, ever.
//
// The mapping is therefore: our `stable` → electron-updater's `latest` feed (the
// file we actually publish), our `beta` → its `beta` feed, which `allowPrerelease`
// makes fall back to `latest*.yml` when no beta asset exists (see
// `GitHubProvider.getLatestVersion`) *and* which lets a prerelease tag win in the
// Atom-feed scan. Kept electron-free + pure so it unit-tests in plain node,
// mirroring `floor.ts` and `update-state.ts`.

import type { UpdateChannel } from './floor';

/** How `autoUpdater` should be configured for one of our channels. */
export type FeedChannel = {
  /**
   * `autoUpdater.channel` — the *feed file* prefix, not our channel name.
   * Always a string: electron-updater's setter throws when handed `null` after a
   * previous string, so switching beta → stable must pass `'latest'` (which
   * resolves to the same asset as leaving the channel unset) rather than clearing it.
   */
  channel: string;
  /** Let a prerelease tag/asset win — only on `beta`. Also enables the `latest*.yml` fallback. */
  allowPrerelease: boolean;
  /**
   * `autoUpdater`'s channel setter force-sets `allowDowngrade = true`; re-assert it
   * explicitly so `stable` never offers an *older* build as an "update", while
   * `beta` keeps the downgrade path that makes leaving the channel possible.
   */
  allowDowngrade: boolean;
};

export function feedChannelFor(channel: UpdateChannel): FeedChannel {
  return channel === 'beta'
    ? { channel: 'beta', allowPrerelease: true, allowDowngrade: true }
    : { channel: 'latest', allowPrerelease: false, allowDowngrade: false };
}
