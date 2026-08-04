import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { COUNCIL_FORMATS_META, type CouncilFormat } from '@midnite/shared';

/**
 * The council-format i18n seam (Phase 82 Theme D) — the same shape as
 * {@link useNodeLabels} for the workflow node catalogue, and for the same reason.
 *
 * `COUNCIL_FORMATS_META` in `@midnite/shared` carries each format's English
 * `label` + `description`, and `shared` is **i18n-agnostic by rule**: the gateway
 * reads the very same table when it builds the synthesis prompt and when it
 * explains why an anonymized format needs ≥2 responses. So the English stays put
 * and stays canonical; translation happens **here, at the web call site, by key
 * convention**, with the shared English as the per-key fallback:
 *
 * ```text
 * council.formats.<format>.label
 * council.formats.<format>.description
 * ```
 *
 * Format ids are plain identifiers (`brainstorm`, `demotivate`, …) with no dots,
 * so unlike the node seam this needs no key escaping.
 *
 * **Fallback.** Each resolver checks `t.has(key)` first and returns the shared
 * English when the key is absent, so a format added to `shared` renders (in
 * English) before its catalog copy lands — never a raw key path, never a throw.
 * `council-format-coverage.test.ts` drives the same registry and fails CI if a
 * format ships without en-GB + fr-FR copy, so that fallback stays a safety net
 * rather than a habit.
 */
export type CouncilFormatLabels = {
  /** Display name of a format (pickers, chips, synthesis header). */
  label: (format: CouncilFormat) => string;
  /** One-line explanation of what the format does with the pooled responses. */
  description: (format: CouncilFormat) => string;
};

export function useCouncilFormatLabels(): CouncilFormatLabels {
  const t = useTranslations('council');

  return useMemo(() => {
    const resolve = (key: string, fallback: string): string => (t.has(key) ? t(key) : fallback);
    return {
      label: (format) =>
        resolve(`formats.${format}.label`, COUNCIL_FORMATS_META[format].label),
      description: (format) =>
        resolve(`formats.${format}.description`, COUNCIL_FORMATS_META[format].description),
    };
  }, [t]);
}
