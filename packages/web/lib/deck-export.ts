import type { Deck, DeckTheme } from '@midnite/shared';
import { buildSlidesHtml } from '@/lib/deck-content';

// Pinned to the installed `reveal.js` dependency so the exported deck renders the
// same way it does in-app. Bump alongside the package version.
export const REVEAL_CDN_VERSION = '6.0.1';
const CDN = `https://cdn.jsdelivr.net/npm/reveal.js@${REVEAL_CDN_VERSION}`;

type Colors = { background: string; foreground: string; accent: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** URL/file-safe slug for the downloaded filename. */
export function deckSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'deck';
}

/**
 * Serialize a deck to a **standalone** reveal.js HTML document — slides + concrete
 * theme colours inlined, reveal.js itself loaded from a pinned CDN. Opens in any
 * browser with no midnite required. Pure + testable: callers pass the already-built
 * (sanitized) slides HTML and resolved colour strings.
 */
export function buildStandaloneHtml(opts: {
  name: string;
  slidesHtml: string;
  colors: Colors;
}): string {
  const { name, slidesHtml, colors } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(name)}</title>
<link rel="stylesheet" href="${CDN}/dist/reveal.css" />
<style>
  :root {
    --r-background-color: ${colors.background};
    --r-main-color: ${colors.foreground};
    --r-heading-color: ${colors.foreground};
    --r-link-color: ${colors.accent};
    --r-link-color-hover: ${colors.accent};
    --r-selection-background-color: ${colors.accent};
  }
  html, body { margin: 0; height: 100%; }
  .reveal { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  .reveal h1, .reveal h2, .reveal h3 { text-transform: none; }
</style>
</head>
<body>
<div class="reveal"><div class="slides">
${slidesHtml}
</div></div>
<script src="${CDN}/dist/reveal.js"></script>
<script src="${CDN}/plugin/markdown/markdown.js"></script>
<script>
  Reveal.initialize({ hash: true, controls: true, progress: true, center: true, plugins: [RevealMarkdown] });
</script>
</body>
</html>
`;
}

/**
 * Resolve the deck's effective colours for export. A per-deck override wins;
 * otherwise the current app theme's CSS vars are read (so the export matches what
 * the user sees), falling back to sensible dark defaults outside the browser.
 */
export function resolveThemeColors(theme?: DeckTheme): Colors {
  const read = (varName: string, fallback: string): string => {
    if (typeof window === 'undefined') return fallback;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return raw ? `hsl(${raw})` : fallback;
  };
  return {
    background: theme?.background ? `hsl(${theme.background})` : read('--background', 'hsl(222 47% 11%)'),
    foreground: theme?.foreground ? `hsl(${theme.foreground})` : read('--foreground', 'hsl(210 40% 98%)'),
    accent: theme?.accent ? `hsl(${theme.accent})` : read('--accent', 'hsl(217 91% 60%)'),
  };
}

/**
 * Build the standalone HTML for a deck and trigger a browser download. Imports
 * DOMPurify lazily (client-only) to sanitize HTML slides, mirroring the preview.
 */
export async function downloadDeckHtml(deck: Deck): Promise<void> {
  const { default: DOMPurify } = await import('dompurify');
  const slidesHtml = buildSlidesHtml(deck.content.slides, (html) => DOMPurify.sanitize(html));
  const html = buildStandaloneHtml({
    name: deck.name,
    slidesHtml,
    colors: resolveThemeColors(deck.content.theme),
  });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${deckSlug(deck.name)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
