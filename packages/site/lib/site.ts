// Central place for outbound links / brand strings.
// The source repo (bilo-io/midnite) is private, so all *public-facing* GitHub links
// — "View on GitHub", issues, and the desktop download assets — point at the public
// companion repo (bilo-io/midnite-app), which hosts the release binaries and the
// issue tracker. A private repo can't serve anonymous release downloads.
export const GITHUB_URL = 'https://github.com/bilo-io/midnite-app';
// Latest desktop release — the page lists the macOS .dmg assets (arm64 + x64).
export const RELEASES_URL = `${GITHUB_URL}/releases/latest`;
export const APP_URL = 'https://midnite-web-vision-studios-projects.vercel.app';
export const DOCS_URL = 'https://midnite-docs-vision-studios-projects.vercel.app';

export const TAGLINE = 'Multitask Claude Code';
