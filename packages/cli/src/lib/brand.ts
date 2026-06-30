import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Brand constants ────────────────────────────────────────────────────────────
// The midnite mark is a circle split into quadrants (two solid, two light) — a
// duality nod to "midnight". In a terminal we render the split with two block
// glyphs of differing density on a single accent colour, so the mark reads the
// same whether it's painted with raw ANSI (here) or via ink's `color` prop (the
// `watch` dashboard) or piped as plain text. The accent is the Claude burnt-orange.
export const BRAND_ACCENT = '#D97757';
const ACCENT_RGB = [0xd9, 0x77, 0x57] as const;

const TAGLINE = 'multitask orchestrator for Claude Code';

const SOLID = '█'; // the two solid (dark) quadrants
const LIGHT = '▒'; // the two light quadrants

/**
 * Whether decorative colour/chrome should be emitted. Gates on a real TTY and the
 * `NO_COLOR` convention so piped/redirected output stays clean. (Theme E will fold
 * an explicit `--json` off-switch into this same gate.)
 */
export function isInteractive(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}

/** Wrap text in the brand accent (24-bit) when interactive; otherwise return it bare. */
export function accent(text: string): string {
  if (!isInteractive()) return text;
  const [r, g, b] = ACCENT_RGB;
  return `\x1b[1;38;2;${r};${g};${b}m${text}\x1b[0m`;
}

/**
 * Build the split-circle mark as a grid of block glyphs. Pure geometry — no image
 * decoding. `rows` chooses the size; columns are ~2× rows to offset the ~2:1
 * height:width of terminal cells so the disc reads round.
 */
export function logoLines(rows = 8): string[] {
  const cols = rows * 2;
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const ny = (r / (rows - 1)) * 2 - 1; // -1 (top) … +1 (bottom)
    let line = '';
    for (let c = 0; c < cols; c++) {
      const nx = (c / (cols - 1)) * 2 - 1; // -1 (left) … +1 (right)
      if (nx * nx + ny * ny > 1) {
        line += ' '; // outside the disc
      } else if (nx * ny > 0) {
        line += SOLID; // top-left & bottom-right quadrants
      } else {
        line += LIGHT; // top-right & bottom-left quadrants
      }
    }
    out.push(line);
  }
  return out;
}

/** The CLI version, read from package.json (falls back to a placeholder, never throws). */
export function getVersion(): string {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * The full entry banner: the mark, the wordmark + version, and the tagline. Colour
 * is applied only when {@link isInteractive}; piped output is plain ASCII-art text.
 */
export function banner(): string {
  const mark = logoLines().map((l) => accent(l)).join('\n');
  const wordmark = `${accent('midnite')}  v${getVersion()}`;
  return `${mark}\n\n  ${wordmark}\n  ${TAGLINE}\n`;
}
