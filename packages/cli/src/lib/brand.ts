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

// The full midnite mark as pre-rendered ASCII art — a crescent-lit disc. Used for
// the entry banner (help + bare invoke). Kept as a literal so it needs no asset
// file at runtime; backticks/backslashes in the art are escaped for the template.
const LOGO_ART = `             $$$$$$$$$$$$$$
         $$$$#/!,'    '"l\\o$$$$
      $$$%j"                ^t%$$$
    $$$k<                      >k$$$
   $$&-           ;ii"           ~W$$
  $$p\`       ^vM@$$$$$$@b(.       'q$$
 $$o\`      "YJf|rQ#@$$$$$$@u       'k$$
$$*                 uB$$$$$$8I       *$$
@@/                  \`M$$$$$@&\`      /$$
@$;                   +$$$$$$$0      ;$$
@B                     *$$$$$$a\`      B$
 .@@@@@@@@@@@@@@@@@@@@@"      l8@@@@@@.
  o$$$$$$$$$$$$$$$$$$$m       ]@$$$$$o
  z$$$$$$$$$$$$$$$$$@M"      ^&@$$$$$z
  ;@$$$$$$@@$$$$$$@8|       'a@$$$$$@;
   l8$$$$$@b1tXUn}^        j@@$$$$$%>
    <8$$$$$$@#|^        <CB@$$$$$$8+
     ^q$$$$$$$$$@%apb&@@$$$$$$$$$d"
       ik@$$$$$$$$$$$$$$$$$$$$@hi
         .c&$$$$$$$$$$$$$$$$&X.
             ;Y#&B@@@@B&#JI`.split('\n');

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

// Injected at bundle time by the desktop's esbuild step (Phase 77): a single-file
// bundle can't read `../../package.json` relative to this module, so the version is
// baked in via `define`. Guarded with `typeof` so the normal (unbundled) build — where
// this identifier is never declared — falls through to the package.json read below.
declare const __MIDNITE_CLI_VERSION__: string | undefined;

/** The CLI version. Prefers a bundle-time injected constant (the desktop's esbuild
 *  bundle), else reads package.json. Falls back to a placeholder, never throws. */
export function getVersion(): string {
  if (typeof __MIDNITE_CLI_VERSION__ !== 'undefined' && __MIDNITE_CLI_VERSION__) {
    return __MIDNITE_CLI_VERSION__;
  }
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
  const mark = LOGO_ART.map((l) => accent(l)).join('\n');
  const wordmark = `${accent('midnite')}  v${getVersion()}`;
  return `${mark}\n\n  ${wordmark}\n  ${TAGLINE}\n`;
}
