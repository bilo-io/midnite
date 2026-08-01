import { Children, isValidElement, type ReactNode } from 'react';

/**
 * Flattens a heading's React children down to its plain text, walking nested
 * elements. Headings routinely wrap part of their text in markup — `## The
 * \`cn()\` helper` compiles to an `<h2>` whose children are a string, a `<code>`
 * element and another string — so a shallow `String(children)` would drop the
 * code span and slug two different headings identically.
 */
export function extractText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) return extractText(child.props.children);
      return '';
    })
    .join('');
}

/**
 * GitHub-flavoured heading slug: lower-cased, accents stripped, punctuation
 * dropped, whitespace collapsed to single hyphens. Matches what `rehype-slug`
 * produced for docs, so existing deep-links keep resolving after the migration.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Per-`Prose` slug bookkeeping: how many times each base slug has been claimed. */
export type SlugRegistry = Map<string, number>;

/**
 * Claims a unique id for `text` within one registry, suffixing repeats
 * (`overview`, `overview-1`, `overview-2`) so two identically-titled sections
 * still get distinct anchors. An empty slug (a heading of only punctuation or an
 * icon) falls back to a stable positional id rather than an empty `id`.
 */
export function claimSlug(registry: SlugRegistry, text: string): string {
  const base = slugify(text) || `section-${registry.size + 1}`;
  const seen = registry.get(base) ?? 0;
  registry.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen}`;
}
