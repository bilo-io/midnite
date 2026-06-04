// Pure color helpers for project tags. No external deps — usable from shared,
// gateway, and web. Project colors are arbitrary user-chosen hex values, so we
// compute a readable text color (black/white) from the background's contrast
// rather than relying on hand-tuned theme tokens.

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** True if the string is a valid 3- or 6-digit hex color (with or without `#`). */
export function isHexColor(input: string): boolean {
  return HEX_RE.test(input.trim());
}

/**
 * Validate and normalize a hex color to lowercase `#rrggbb`.
 * Accepts `#rgb` / `rgb` / `#rrggbb` / `rrggbb`. Throws on anything else.
 */
export function normalizeHex(input: string): string {
  const m = HEX_RE.exec(input.trim());
  if (!m) throw new Error(`invalid hex color: ${input}`);
  let hex = m[1]!.toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${hex}`;
}

function channelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0 = black, 1 = white) for a hex color. */
export function relativeLuminance(hex: string): number {
  const norm = normalizeHex(hex).slice(1);
  const r = parseInt(norm.slice(0, 2), 16);
  const g = parseInt(norm.slice(2, 4), 16);
  const b = parseInt(norm.slice(4, 6), 16);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

/** WCAG contrast ratio (1..21) between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Pick black or white text for the highest contrast against `background`.
 * This drives the project tag's auto light/dark text.
 */
export function readableTextColor(background: string): '#000000' | '#ffffff' {
  const onWhite = contrastRatio(background, '#ffffff');
  const onBlack = contrastRatio(background, '#000000');
  return onBlack >= onWhite ? '#000000' : '#ffffff';
}
