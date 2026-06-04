import { describe, expect, it } from 'vitest';
import { applyChecklistState, parsePlanChecklist } from './plan.js';

const SAMPLE = `# Atlas — plan

> intro line

## Scope
- [ ] Define goals
- [x] Pick milestones

## Build
- [ ] Wire the API
* [ ] Add the UI
`;

describe('parsePlanChecklist', () => {
  it('groups items under headings and reads checkbox state', () => {
    const sections = parsePlanChecklist(SAMPLE);
    expect(sections.map((s) => s.heading)).toEqual(['Scope', 'Build']);
    expect(sections[0]!.items).toEqual([
      { id: 'item-0', text: 'Define goals', checked: false },
      { id: 'item-1', text: 'Pick milestones', checked: true },
    ]);
    expect(sections[1]!.items.map((i) => i.text)).toEqual(['Wire the API', 'Add the UI']);
  });

  it('drops heading-only sections (e.g. the title)', () => {
    const sections = parsePlanChecklist('# Title only\n\nsome prose');
    expect(sections).toEqual([]);
  });

  it('keeps items that appear before any heading', () => {
    const sections = parsePlanChecklist('- [ ] orphan item');
    expect(sections).toEqual([
      { heading: null, items: [{ id: 'item-0', text: 'orphan item', checked: false }] },
    ]);
  });
});

describe('applyChecklistState', () => {
  it('flips checkbox markers in place, preserving other lines', () => {
    const sections = parsePlanChecklist(SAMPLE);
    const items = sections.flatMap((s) => s.items).map((i) => ({ ...i, checked: true }));
    const out = applyChecklistState(SAMPLE, items);
    expect(out).toContain('- [x] Define goals');
    expect(out).toContain('- [x] Wire the API');
    expect(out).toContain('* [x] Add the UI');
    // Non-item lines untouched.
    expect(out).toContain('> intro line');
    expect(out).toContain('## Scope');
  });
});
