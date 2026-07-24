// Single source of truth for how each platform installs the desktop app. The
// download page renders from this; bump DESKTOP_VERSION to match the published
// release tag.
import { GITHUB_URL } from './site';

export type Platform = 'mac' | 'windows' | 'linux';

export type DownloadTarget = {
  platform: Platform;
  /** Present for platforms shipping per-architecture builds. */
  arch?: 'arm64' | 'x64';
  /** Short label shown on the button, e.g. "Windows". */
  label: string;
  /** File extension, shown in the button text. */
  ext: string;
  /** false → rendered as a disabled "Coming soon" button (no build yet). */
  available: boolean;
  /** Release asset filename; required when `available`. */
  assetName?: string;
};

/** Desktop version; keep in step with the published GitHub release tag. */
export const DESKTOP_VERSION = '0.7.0';

/**
 * macOS installs via the curl one-liner (install.sh in the public downloads
 * repo), not a direct .dmg link: the app isn't notarized yet, so a
 * browser-downloaded build gets quarantined and blocked by Gatekeeper (and
 * macOS 15 removed the right-click → Open bypass). curl sets no quarantine
 * attribute, so the installed app opens cleanly on first launch — and
 * re-running the same command is also the update path.
 */
export const MAC_INSTALL_COMMAND = `curl -fsSL https://raw.githubusercontent.com/bilo-io/midnite-app/main/install.sh | sh`;

export const PLATFORM_LABELS: Record<Platform, string> = {
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

/** Platform display order (also the order of the "all platforms" list). */
export const PLATFORM_ORDER: Platform[] = ['mac', 'windows', 'linux'];

// Direct-download builds (macOS installs via MAC_INSTALL_COMMAND instead).
// Built for every OS by the tagged release workflow (.github/workflows/release.yml);
// asset names match electron-builder's `artifactName`. Links resolve once a release
// for DESKTOP_VERSION is published.
export const DOWNLOAD_TARGETS: DownloadTarget[] = [
  {
    platform: 'windows',
    arch: 'x64',
    label: 'Windows',
    ext: '.exe',
    available: true,
    assetName: `midnite-${DESKTOP_VERSION}-x64.exe`,
  },
  {
    platform: 'linux',
    arch: 'x64',
    label: 'Linux',
    ext: '.AppImage',
    available: true,
    assetName: `midnite-${DESKTOP_VERSION}-x86_64.AppImage`,
  },
];

/** GitHub "latest release" deep link for an asset (resolves once a release ships). */
export function assetUrl(assetName: string): string {
  return `${GITHUB_URL}/releases/latest/download/${assetName}`;
}

export function targetsFor(platform: Platform): DownloadTarget[] {
  return DOWNLOAD_TARGETS.filter((t) => t.platform === platform);
}

export function platformAvailable(platform: Platform): boolean {
  return targetsFor(platform).some((t) => t.available);
}
