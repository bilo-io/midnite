// Single source of truth for how each platform installs the desktop app. The
// download page renders from this; bump DESKTOP_VERSION to match the published
// release tag.
import { GITHUB_URL } from './site';

export type Platform = 'mac' | 'windows' | 'linux';

export type DownloadTarget = {
  platform: Platform;
  arch: 'arm64' | 'x64';
  /** Short label shown next to the manual-download link, e.g. "Windows". */
  label: string;
  /** File extension, shown next to the label. */
  ext: string;
  /** Release asset filename. */
  assetName: string;
};

/** Desktop version; keep in step with the published GitHub release tag. */
export const DESKTOP_VERSION = '0.8.0';

/**
 * macOS (and Linux — see below) install via a curl one-liner (served from the
 * marketing site itself — `public/install.sh`), not a direct download link:
 * the app isn't notarized yet, so a browser-downloaded build gets quarantined
 * and blocked by Gatekeeper (and macOS 15 removed the right-click → Open
 * bypass). curl sets no quarantine attribute, so the installed app opens
 * cleanly on first launch — and re-running the same command is also the
 * update path. The script is location-independent (it resolves the latest
 * release off GitHub), so serving it from our own short domain is purely a
 * friendlier, more shareable URL.
 */
export const MAC_INSTALL_COMMAND = `curl -fsSL https://midnite-app.vercel.app/install.sh | sh`;

/**
 * Linux runs the exact same script as macOS — `install.sh` detects the OS
 * itself and installs the AppImage to `~/.local/bin` with a desktop-menu
 * entry, instead of leaving a bare, unintegrated `.AppImage` download in
 * ~/Downloads.
 */
export const LINUX_INSTALL_COMMAND = MAC_INSTALL_COMMAND;

/**
 * Windows installs via a PowerShell one-liner for the Windows-native reason
 * macOS/Linux use curl: the NSIS installer isn't signed, so a browser
 * download carries the Mark-of-the-Web and can trigger a SmartScreen
 * "Windows protected your PC" warning. The script (`public/install.ps1`)
 * strips that flag with `Unblock-File` before running the installer silently.
 */
export const WINDOWS_INSTALL_COMMAND = `irm https://midnite-app.vercel.app/install.ps1 | iex`;

/** The copyable one-liner for each platform — all three install the app and leave it running. */
export const PLATFORM_INSTALL_COMMAND: Record<Platform, string> = {
  mac: MAC_INSTALL_COMMAND,
  windows: WINDOWS_INSTALL_COMMAND,
  linux: LINUX_INSTALL_COMMAND,
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

/** Platform display order (also the order of the "all platforms" list). */
export const PLATFORM_ORDER: Platform[] = ['mac', 'windows', 'linux'];

// Raw release assets, kept only for the "prefer a manual download" fallback
// links (every platform now installs via PLATFORM_INSTALL_COMMAND instead of
// a primary download button). Built for every OS by the tagged release
// workflow (.github/workflows/release.yml); asset names match electron-builder's
// `artifactName`. Links resolve once a release for DESKTOP_VERSION is published.
export const DOWNLOAD_TARGETS: DownloadTarget[] = [
  {
    platform: 'mac',
    arch: 'arm64',
    label: 'macOS',
    ext: '.dmg',
    assetName: `midnite-${DESKTOP_VERSION}-arm64.dmg`,
  },
  {
    platform: 'windows',
    arch: 'x64',
    label: 'Windows',
    ext: '.exe',
    assetName: `midnite-${DESKTOP_VERSION}-x64.exe`,
  },
  {
    platform: 'linux',
    arch: 'x64',
    label: 'Linux',
    ext: '.AppImage',
    assetName: `midnite-${DESKTOP_VERSION}-x86_64.AppImage`,
  },
];

/** GitHub "latest release" deep link for an asset (resolves once a release ships). */
export function assetUrl(assetName: string): string {
  return `${GITHUB_URL}/releases/latest/download/${assetName}`;
}
