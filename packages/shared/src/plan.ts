// Parsing + serialization for the markdown plan a project drafts. The gateway
// produces GitHub-Flavored Markdown with "## " headings and "- [ ] " checkbox
// items; the web renders it as an interactive checklist and turns checked items
// into tasks.

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistSection {
  heading: string | null;
  items: ChecklistItem[];
}

const HEADING_RE = /^#{1,6}\s+(.*\S)\s*$/;
const ITEM_RE = /^\s*[-*]\s+\[([ xX])\]\s+(.*\S)\s*$/;

/**
 * Parse a markdown plan into sections of checkbox items. Heading lines start a
 * new section; items before any heading land in a leading `heading: null`
 * section. Sections with no checkbox items (e.g. a lone title) are dropped.
 */
export function parsePlanChecklist(markdown: string): ChecklistSection[] {
  const sections: ChecklistSection[] = [];
  let current: ChecklistSection | null = null;
  let idx = 0;

  for (const line of markdown.split('\n')) {
    const heading = HEADING_RE.exec(line);
    if (heading) {
      current = { heading: heading[1]!, items: [] };
      sections.push(current);
      continue;
    }
    const item = ITEM_RE.exec(line);
    if (item) {
      if (!current) {
        current = { heading: null, items: [] };
        sections.push(current);
      }
      current.items.push({
        id: `item-${idx++}`,
        text: item[2]!,
        checked: item[1]!.toLowerCase() === 'x',
      });
    }
  }

  return sections.filter((s) => s.items.length > 0);
}

/**
 * Rewrite a plan's checkbox markers from an ordered item list, preserving every
 * other line (headings, prose, blank lines). `items` must be in document order
 * (as produced by parsePlanChecklist flattened across sections).
 */
export function applyChecklistState(markdown: string, items: ChecklistItem[]): string {
  let n = 0;
  return markdown
    .split('\n')
    .map((line) => {
      const item = ITEM_RE.exec(line);
      if (!item) return line;
      const checked = items[n]?.checked ?? item[1]!.toLowerCase() === 'x';
      n++;
      return line.replace(/\[[ xX]\]/, checked ? '[x]' : '[ ]');
    })
    .join('\n');
}
