import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@midnite/shared';

/**
 * Tell a model which language to answer in (Phase 82 D).
 *
 * LLM output is *generated* copy, not UI copy — no message catalog can translate
 * it, so the only way a localised app answers in the user's language is to say so
 * in the prompt. The request carries an explicit `locale` (see
 * `PostMemoryChatRequestSchema` / `GenerateMemoryArtifactRequestSchema`) and this
 * pure helper turns it into one sentence appended to the system prompt.
 *
 * Two deliberate properties:
 * - **`undefined` and the default locale return `''`.** The models already answer
 *   in English, so an en-GB instruction would only spend tokens (and every caller
 *   then has an untouched prompt, which keeps the existing specs honest).
 * - **Language names come from `SUPPORTED_LOCALES`**, never a second hardcoded
 *   list — adding a locale to the shared contract localises generation for free.
 *
 * The instruction is *generation-scoped*: it never claims to translate identifiers,
 * so ids the answer must round-trip (source ids the citation filter matches back
 * against, code symbols, URLs) are explicitly carved out.
 */
export function outputLanguageInstruction(locale?: Locale | null): string {
  if (!locale || locale === DEFAULT_LOCALE) return '';
  const info = SUPPORTED_LOCALES.find((l) => l.code === locale);
  if (!info) return '';
  return (
    `Write your entire response in ${info.label} (${info.nativeLabel}). ` +
    'Keep any proper nouns, code identifiers, URLs and source ids unchanged.'
  );
}

/**
 * Append {@link outputLanguageInstruction} to a system prompt, returning the prompt
 * untouched when there's nothing to add (default locale / no locale). The one place
 * the append is spelled out, so every LLM call site composes it the same way.
 */
export function withOutputLanguage(system: string, locale?: Locale | null): string {
  const instruction = outputLanguageInstruction(locale);
  return instruction ? `${system} ${instruction}` : system;
}
