/**
 * Convert a computed-style color (`rgb(9, 9, 11)` / `rgba(9, 9, 11, 1)`) to
 * `#rrggbb` — the only format the desktop window-chrome bridge accepts for the
 * native window backing (Phase 81). Returns null for anything else (keywords,
 * gradients, transparent), so callers just skip the retint.
 */
export function cssRgbToHex(color: string): string | null {
  const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/.exec(
    color.trim(),
  );
  if (!m) return null;
  const channels = [m[1]!, m[2]!, m[3]!].map((c) => Number(c));
  if (channels.some((c) => c > 255)) return null;
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
