// Link kinds for project sources and task review links. Kind detection is pure
// and URL-pattern based so the web (instant icon) and gateway (storage) agree.

export const SOURCE_KINDS = [
  'github',
  'figma',
  'google-docs',
  'notion',
  'youtube',
  'link',
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  github: 'GitHub',
  figma: 'Figma',
  'google-docs': 'Google Docs',
  notion: 'Notion',
  youtube: 'YouTube',
  link: 'Link',
};

/**
 * Best-effort detection of a link's provider from its URL.
 * Falls back to 'link' for anything unrecognized or unparseable.
 */
export function detectSourceKind(url: string): SourceKind {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 'link';
  }
  const matches = (domain: string): boolean =>
    host === domain || host.endsWith(`.${domain}`);

  if (matches('github.com')) return 'github';
  if (matches('figma.com')) return 'figma';
  if (matches('docs.google.com') || matches('drive.google.com')) return 'google-docs';
  if (matches('notion.so') || matches('notion.site')) return 'notion';
  if (matches('youtube.com') || matches('youtu.be')) return 'youtube';
  return 'link';
}

function githubParts(url: string): string[] | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com' && !u.hostname.endsWith('.github.com')) return null;
    return u.pathname.split('/').filter(Boolean);
  } catch {
    return null;
  }
}

/** Parse a GitHub PR URL into "owner/repo" + PR number, or null. */
export function parseGithubPr(url: string): { repo: string; prNumber: number } | null {
  const parts = githubParts(url);
  if (!parts || parts.length < 4 || parts[2] !== 'pull') return null;
  const n = Number(parts[3]);
  if (!Number.isInteger(n) || n <= 0) return null;
  return { repo: `${parts[0]}/${parts[1]}`, prNumber: n };
}

/** "owner/repo" for any github.com URL, or null. */
export function parseGithubRepo(url: string): string | null {
  const parts = githubParts(url);
  if (!parts || parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`;
}
