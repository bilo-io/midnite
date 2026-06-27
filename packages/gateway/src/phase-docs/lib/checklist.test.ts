import { describe, it, expect } from 'vitest';
import { phaseItemAnchor } from '@midnite/shared';
import { setChecklistItem } from './checklist';

const DOC = ['# Phase 1', '', '- [ ] First task', '- [ ] Second task', '- [x] Third task', ''].join(
  '\n',
);

describe('setChecklistItem', () => {
  it('ticks the matching unchecked line', () => {
    const res = setChecklistItem(DOC, phaseItemAnchor('- [ ] First task'), true);
    expect(res.matched).toBe(true);
    expect(res.changed).toBe(true);
    expect(res.content).toContain('- [x] First task');
    expect(res.content).toContain('- [ ] Second task'); // others untouched
  });

  it('un-ticks the matching checked line', () => {
    const res = setChecklistItem(DOC, phaseItemAnchor('- [x] Third task'), false);
    expect(res.matched).toBe(true);
    expect(res.changed).toBe(true);
    expect(res.content).toContain('- [ ] Third task');
  });

  it('is idempotent — already in the desired state means no change', () => {
    const res = setChecklistItem(DOC, phaseItemAnchor('- [x] Third task'), true);
    expect(res.matched).toBe(true);
    expect(res.changed).toBe(false);
    expect(res.content).toBe(DOC);
  });

  it('reports no match for an unknown anchor and leaves content untouched', () => {
    const res = setChecklistItem(DOC, 'no-such-anchor', true);
    expect(res.matched).toBe(false);
    expect(res.changed).toBe(false);
    expect(res.content).toBe(DOC);
  });

  it('matches the right line when several checkboxes exist', () => {
    const res = setChecklistItem(DOC, phaseItemAnchor('- [ ] Second task'), true);
    expect(res.content).toContain('- [ ] First task');
    expect(res.content).toContain('- [x] Second task');
  });

  it('strips markdown emphasis when computing the anchor (matches a bold line)', () => {
    const doc = '- [ ] **Bold** item here';
    const res = setChecklistItem(doc, phaseItemAnchor(doc), true);
    expect(res.changed).toBe(true);
    expect(res.content).toBe('- [x] **Bold** item here');
  });

  it('fuzzy-matches a truncated anchor via prefix (80-char seed truncation)', () => {
    const long =
      '- [ ] ' +
      'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma';
    const fullAnchor = phaseItemAnchor(long);
    const truncated = fullAnchor.slice(0, 80).replace(/-+$/g, '');
    const res = setChecklistItem(long, truncated, true);
    expect(res.matched).toBe(true);
    expect(res.content.startsWith('- [x]')).toBe(true);
  });
});
