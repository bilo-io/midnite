/** Cap terms so a pathological paste can't build an enormous MATCH expression. */
const MAX_TERMS = 16;

/**
 * Turn a user's free-text query into a safe FTS5 MATCH expression.
 *
 * Each alphanumeric run becomes a quoted prefix term (`"foo"*`), joined with
 * spaces (implicit AND). Quoting every token means FTS5 syntax characters
 * (`"`, `*`, `(`, `:`, `-`, `^`, `NEAR` …) in user input can never trip a
 * parse error, and the trailing `*` gives search-as-you-type prefix matching.
 *
 * Returns null when there's nothing searchable (caller short-circuits to empty).
 */
export function toFtsMatchQuery(raw: string): string | null {
  const terms = (raw.match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, MAX_TERMS).map((t) => `"${t}"*`);
  return terms.length > 0 ? terms.join(' ') : null;
}
