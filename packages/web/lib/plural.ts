/**
 * Pluralize `singular` for `count`. Returns just the noun (no number), so callers
 * compose `${count} ${plural(...)}`. Handles the common `-y → -ies` rule
 * (memory → memories) and the default `+s`; pass `pluralForm` for irregulars.
 *
 * Centralizes what several views had hand-rolled inline (sessions, projects, …),
 * so the resource-count pill reads one way everywhere.
 */
export function plural(count: number, singular: string, pluralForm?: string): string {
  if (count === 1) return singular;
  if (pluralForm) return pluralForm;
  return /[^aeiou]y$/i.test(singular) ? `${singular.slice(0, -1)}ies` : `${singular}s`;
}
