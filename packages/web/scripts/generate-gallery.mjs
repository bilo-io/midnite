#!/usr/bin/env node
/**
 * Phase 10 Theme E3 — gallery generator.
 *
 * Walks `e2e/__shots__/` and produces two artifacts inside it:
 *   - `gallery.html`   — a self-contained HTML page grouping captures by section
 *   - `SCREENSHOTS.md` — a markdown manifest with relative image paths
 *
 * Run from the repo root or from `packages/web/`:
 *   node packages/web/scripts/generate-gallery.mjs
 *   node scripts/generate-gallery.mjs   (from packages/web)
 *
 * The script is intentionally plain ESM with no dependencies so it runs
 * anywhere `node` is available — no build step, no extra install.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve the shots dir relative to this script's package root.
const WEB_DIR = resolve(__dirname, '..');
const SHOTS_DIR = resolve(WEB_DIR, 'e2e/__shots__');

// ── helpers ─────────────────────────────────────────────────────────────────

/** Walk a directory recursively, returning absolute paths of .png files. */
function walkPngs(dir) {
  /** @type {string[]} */
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkPngs(full));
    } else if (entry.isFile() && entry.name.endsWith('.png')) {
      results.push(full);
    }
  }
  return results;
}

/** Return a human-readable label from a slug: `board-dark` → `Board (dark)`. */
function labelFromSlug(slug) {
  const parts = slug.split('-');
  const last = parts.at(-1);
  const isThemed = last === 'light' || last === 'dark';
  if (isThemed) {
    const name = parts.slice(0, -1).join(' ');
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} (${last})`;
  }
  const name = parts.join(' ');
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

// ── collect images ───────────────────────────────────────────────────────────

let pngs;
try {
  pngs = walkPngs(SHOTS_DIR);
} catch {
  console.error(`[gallery] shots dir not found: ${SHOTS_DIR}`);
  console.error('Run `moon run web:screenshots` first to capture screenshots.');
  process.exit(1);
}

if (pngs.length === 0) {
  console.warn('[gallery] No PNG files found — gallery will be empty.');
}

/**
 * Buckets:
 *   pages: files directly in __shots__/ (name pattern: <page>-<theme>.png)
 *   stories: files under __shots__/stories/<component>/<story>-<theme>.png
 */

/** @type {{ label: string; rel: string; theme: 'light' | 'dark' }[]} */
const pagePngs = [];

/** @type {Map<string, { label: string; rel: string; theme: 'light' | 'dark' }[]>} */
const storyGroups = new Map();

for (const abs of pngs) {
  const rel = relative(SHOTS_DIR, abs);
  const parts = rel.split('/');

  if (parts.length === 1) {
    // Top-level: a page screenshot.
    const stem = basename(rel, '.png');
    const last = stem.split('-').at(-1);
    const theme = last === 'dark' ? 'dark' : 'light';
    pagePngs.push({ label: labelFromSlug(stem), rel, theme });
  } else if (parts[0] === 'stories' && parts.length === 3) {
    // stories/<component>/<story>-<theme>.png
    const component = parts[1];
    const stem = basename(parts[2], '.png');
    const last = stem.split('-').at(-1);
    const theme = last === 'dark' ? 'dark' : 'light';
    if (!storyGroups.has(component)) storyGroups.set(component, []);
    storyGroups.get(component).push({ label: labelFromSlug(stem), rel, theme });
  }
}

// Sort pages: light before dark for each page name.
pagePngs.sort((a, b) => {
  const aName = a.rel.replace(/-(?:light|dark)\.png$/, '');
  const bName = b.rel.replace(/-(?:light|dark)\.png$/, '');
  if (aName !== bName) return aName.localeCompare(bName);
  return a.theme === 'light' ? -1 : 1;
});

// Sort story groups alphabetically; within each group, light before dark.
const sortedStoryGroups = [...storyGroups.entries()].sort(([a], [b]) => a.localeCompare(b));
for (const [, shots] of sortedStoryGroups) {
  shots.sort((a, b) => {
    const aName = a.rel.replace(/-(?:light|dark)\.png$/, '');
    const bName = b.rel.replace(/-(?:light|dark)\.png$/, '');
    if (aName !== bName) return aName.localeCompare(bName);
    return a.theme === 'light' ? -1 : 1;
  });
}

// ── HTML gallery ─────────────────────────────────────────────────────────────

function componentLabel(slug) {
  return slug
    .split('-')
    .map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`)
    .join(' ');
}

function pageGrid(shots) {
  if (shots.length === 0) return '<p class="empty">No page screenshots captured.</p>';
  // Pair up light + dark for side-by-side display.
  /** @type {Map<string, {light?: string; dark?: string; label: string}>} */
  const pairs = new Map();
  for (const s of shots) {
    const key = s.rel.replace(/-(?:light|dark)\.png$/, '');
    if (!pairs.has(key)) pairs.set(key, { label: s.label.replace(/ \((light|dark)\)$/, '') });
    pairs.get(key)[s.theme] = s.rel;
  }
  return [...pairs.values()]
    .map(
      (p) => `
    <div class="pair">
      <h3>${p.label}</h3>
      <div class="pair-images">
        ${p.light ? `<figure><img src="${p.light}" loading="lazy" /><figcaption>Light</figcaption></figure>` : ''}
        ${p.dark ? `<figure><img src="${p.dark}" loading="lazy" /><figcaption>Dark</figcaption></figure>` : ''}
      </div>
    </div>`,
    )
    .join('\n');
}

function storySection([component, shots]) {
  return `
  <details open>
    <summary>${componentLabel(component)} <span class="badge">${shots.length}</span></summary>
    <div class="story-grid">
      ${shots
        .map(
          (s) => `
        <figure>
          <img src="${s.rel}" loading="lazy" />
          <figcaption>${s.label}</figcaption>
        </figure>`,
        )
        .join('\n')}
    </div>
  </details>`;
}

const totalPages = pagePngs.length;
const totalStories = [...storyGroups.values()].reduce((n, g) => n + g.length, 0);
const generatedAt = new Date().toISOString();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>midnite — Screenshot Gallery</title>
  <style>
    :root {
      --bg: #0f0f0f;
      --surface: #1a1a1a;
      --border: #2a2a2a;
      --text: #e5e5e5;
      --muted: #666;
      --accent: #a78bfa;
      font-family: system-ui, -apple-system, sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); padding: 2rem; max-width: 1400px; margin: 0 auto; }
    header { border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 2rem; }
    header h1 { font-size: 1.5rem; font-weight: 600; color: var(--accent); }
    header p { color: var(--muted); font-size: 0.875rem; margin-top: 0.25rem; }
    h2 { font-size: 1.125rem; font-weight: 600; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
    h3 { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--muted); }
    .pair { margin-bottom: 2rem; }
    .pair-images { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .story-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; padding: 1rem 0; }
    figure { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    figure img { width: 100%; height: auto; display: block; border-bottom: 1px solid var(--border); }
    figcaption { font-size: 0.75rem; color: var(--muted); padding: 0.5rem 0.75rem; }
    details { margin-bottom: 1rem; }
    summary { cursor: pointer; padding: 0.5rem 0; font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem; }
    summary:hover { color: var(--accent); }
    .badge { background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 0 0.5rem; font-size: 0.75rem; color: var(--muted); }
    .empty { color: var(--muted); font-style: italic; font-size: 0.875rem; }
    .stats { display: flex; gap: 1.5rem; margin-top: 0.5rem; }
    .stat { font-size: 0.8rem; color: var(--muted); }
    .stat strong { color: var(--text); }
    @media (max-width: 700px) { .pair-images { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>midnite — Screenshot Gallery</h1>
    <p>Generated: ${generatedAt}</p>
    <div class="stats">
      <span class="stat"><strong>${totalPages}</strong> page captures</span>
      <span class="stat"><strong>${sortedStoryGroups.length}</strong> components · <strong>${totalStories}</strong> story captures</span>
    </div>
  </header>

  <h2>Pages</h2>
  ${pageGrid(pagePngs)}

  <h2>Stories</h2>
  ${sortedStoryGroups.length === 0 ? '<p class="empty">No story screenshots captured.</p>' : sortedStoryGroups.map(storySection).join('\n')}
</body>
</html>`;

writeFileSync(join(SHOTS_DIR, 'gallery.html'), html, 'utf8');
console.log(`[gallery] Wrote gallery.html (${totalPages} pages, ${totalStories} story captures)`);

// ── Markdown manifest ─────────────────────────────────────────────────────────

const lines = [
  '# Screenshot manifest',
  '',
  `> Generated: ${generatedAt}`,
  '',
  '## Pages',
  '',
];

if (pagePngs.length === 0) {
  lines.push('_No page screenshots captured._', '');
} else {
  for (const s of pagePngs) {
    lines.push(`- \`${s.rel}\` — ${s.label}`);
  }
  lines.push('');
}

lines.push('## Stories', '');

if (sortedStoryGroups.length === 0) {
  lines.push('_No story screenshots captured._', '');
} else {
  for (const [component, shots] of sortedStoryGroups) {
    lines.push(`### ${componentLabel(component)}`, '');
    for (const s of shots) {
      lines.push(`- \`${s.rel}\` — ${s.label}`);
    }
    lines.push('');
  }
}

writeFileSync(join(SHOTS_DIR, 'SCREENSHOTS.md'), lines.join('\n'), 'utf8');
console.log(`[gallery] Wrote SCREENSHOTS.md`);
