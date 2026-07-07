/**
 * Phase 59 E — light last-result context for the chat command bar. A follow-up
 * like "now make **those** high priority" should apply to the tasks the previous
 * command touched. The gateway parser has no notion of "those" (Theme A/B are
 * one-shot + source-agnostic), so we resolve it **client-side**: detect a
 * back-reference pronoun and expand the command into one concrete command per
 * previously-affected task id, substituting the pronoun with the id.
 *
 * This is deliberately conservative — only a leading/standalone pronoun that
 * refers to the previous result triggers expansion; anything else runs verbatim.
 */

/** Pronouns that refer back to the previous command's affected tasks. */
const BACKREF = /\b(those|them|these|they|that one|it)\b/i;

/**
 * If `text` refers back to the previous result and there are prior affected ids,
 * return one command per id (pronoun → id). Otherwise return `null` (run as-is).
 * With exactly one prior id, "it"/"that" also resolves.
 */
export function expandFollowup(text: string, lastAffectedIds: readonly string[]): string[] | null {
  if (lastAffectedIds.length === 0) return null;
  if (!BACKREF.test(text)) return null;
  return lastAffectedIds.map((id) => text.replace(BACKREF, id));
}

/** Whether a command would be treated as a follow-up given the prior result. */
export function isFollowup(text: string, lastAffectedIds: readonly string[]): boolean {
  return expandFollowup(text, lastAffectedIds) !== null;
}
