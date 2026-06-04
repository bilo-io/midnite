// Project source links. Kind detection is pure and URL-pattern based so both
// the web (instant icon, before the server resolves a title) and the gateway
// (storage) agree on the provider.

export const SOURCE_KINDS = ['google-docs', 'notion', 'youtube', 'link'] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  'google-docs': 'Google Docs',
  notion: 'Notion',
  youtube: 'YouTube',
  link: 'Link',
};

/**
 * Best-effort detection of a source link's provider from its URL.
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

  if (matches('docs.google.com') || matches('drive.google.com')) return 'google-docs';
  if (matches('notion.so') || matches('notion.site')) return 'notion';
  if (matches('youtube.com') || matches('youtu.be')) return 'youtube';
  return 'link';
}
