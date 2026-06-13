import { z } from 'zod';

// Link kinds for project sources and task review links. Kind detection is pure
// and URL-pattern based so the web (instant icon) and gateway (storage) agree.

export const SOURCE_KINDS = [
  'github',
  'figma',
  'google-docs',
  'google-sheets',
  'google-slides',
  'google-drive',
  'notion',
  'youtube',
  'x',
  'facebook',
  'linkedin',
  'reddit',
  'medium',
  'substack',
  'link',
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  github: 'GitHub',
  figma: 'Figma',
  'google-docs': 'Google Docs',
  'google-sheets': 'Google Sheets',
  'google-slides': 'Google Slides',
  'google-drive': 'Google Drive',
  notion: 'Notion',
  youtube: 'YouTube',
  x: 'X',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  medium: 'Medium',
  substack: 'Substack',
  link: 'Link',
};

/**
 * Best-effort detection of a link's provider from its URL.
 * Falls back to 'link' for anything unrecognized or unparseable.
 */
export function detectSourceKind(url: string): SourceKind {
  let host: string;
  let path: string;
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    return 'link';
  }
  const matches = (domain: string): boolean =>
    host === domain || host.endsWith(`.${domain}`);

  if (matches('github.com')) return 'github';
  if (matches('figma.com')) return 'figma';
  // Docs, Sheets and Slides all live under docs.google.com — split by path.
  if (matches('docs.google.com')) {
    if (path.startsWith('/spreadsheets')) return 'google-sheets';
    if (path.startsWith('/presentation')) return 'google-slides';
    return 'google-docs';
  }
  if (matches('sheets.google.com')) return 'google-sheets';
  if (matches('slides.google.com')) return 'google-slides';
  if (matches('drive.google.com')) return 'google-drive';
  if (matches('notion.so') || matches('notion.site')) return 'notion';
  if (matches('youtube.com') || matches('youtu.be')) return 'youtube';
  if (matches('x.com') || matches('twitter.com')) return 'x';
  if (matches('facebook.com') || matches('fb.com')) return 'facebook';
  if (matches('linkedin.com')) return 'linkedin';
  if (matches('reddit.com')) return 'reddit';
  if (matches('medium.com')) return 'medium';
  if (matches('substack.com')) return 'substack';
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

// A new display/run order for a list of sources — every source id, once, in the
// desired order. Generic across project, memory and global-knowledge sources
// (mirrors ReorderCouncilParticipantsRequestSchema).
export const ReorderSourcesRequestSchema = z.object({
  sourceIds: z.array(z.string().min(1)).min(1),
});
export type ReorderSourcesRequest = z.infer<typeof ReorderSourcesRequestSchema>;
