import { phaseItemAnchor } from '@midnite/shared';

/** A markdown task-list line: `- [ ] text` / `* [x] text` (captures bracket / mark / rest). */
const CHECKBOX_RE = /^(\s*[-*]\s*\[)([ xX])(\].*)$/;

export type ChecklistApplyResult = {
  content: string;
  /** A checkbox line whose anchor matched was found. */
  matched: boolean;
  /** The content actually changed (false when already in the desired state). */
  changed: boolean;
};

/**
 * Set the checkbox state of the phase-doc line whose computed {@link phaseItemAnchor}
 * matches `anchor`. Exact match first, then a bounded prefix fallback (the anchor is
 * truncated to 80 chars at seed time, so a long line can lose its tail). Idempotent:
 * if the matched line already holds the desired state, `changed` is false. No match →
 * `matched: false` and the content is returned untouched (caller logs + skips).
 */
export function setChecklistItem(
  content: string,
  anchor: string,
  checked: boolean,
): ChecklistApplyResult {
  const lines = content.split('\n');

  const findExact = (): number => {
    for (let i = 0; i < lines.length; i++) {
      if (CHECKBOX_RE.test(lines[i]!) && phaseItemAnchor(lines[i]!) === anchor) return i;
    }
    return -1;
  };
  const findFuzzy = (): number => {
    if (!anchor) return -1;
    for (let i = 0; i < lines.length; i++) {
      if (!CHECKBOX_RE.test(lines[i]!)) continue;
      const a = phaseItemAnchor(lines[i]!);
      if (a && (a.startsWith(anchor) || anchor.startsWith(a))) return i;
    }
    return -1;
  };

  const idx = findExact() === -1 ? findFuzzy() : findExact();
  if (idx === -1) return { content, matched: false, changed: false };

  const m = CHECKBOX_RE.exec(lines[idx]!)!;
  const current = m[2]!.toLowerCase() === 'x';
  if (current === checked) return { content, matched: true, changed: false };

  lines[idx] = `${m[1]}${checked ? 'x' : ' '}${m[3]}`;
  return { content: lines.join('\n'), matched: true, changed: true };
}
