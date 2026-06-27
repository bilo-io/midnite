import { describe, expect, it, vi } from 'vitest';
import { BreakdownService, extractCheckboxItems } from './breakdown.service';
import type { LlmService } from './llm/llm.service';

function makeService(llm: Partial<LlmService>): BreakdownService {
  return new BreakdownService(llm as LlmService);
}

const DOC = `# Phase 9 — Office

## Theme A
- [ ] Replace session cookies with JWTs
- [x] Audit the login form
- not a task line
- [ ] Add refresh-token rotation
`;

describe('extractCheckboxItems', () => {
  it('lifts checkbox lines into anchored items, ignoring non-checkbox lines', () => {
    const items = extractCheckboxItems(DOC);
    expect(items.map((i) => i.title)).toEqual([
      'Replace session cookies with JWTs',
      'Audit the login form',
      'Add refresh-token rotation',
    ]);
    expect(items[0]!.anchor).toBe('replace-session-cookies-with-jwts');
  });

  it('dedupes repeated lines by anchor (first wins)', () => {
    const items = extractCheckboxItems('- [ ] Same thing\n- [x] Same thing\n');
    expect(items).toHaveLength(1);
  });
});

describe('BreakdownService.parseDoc', () => {
  it('falls back to a deterministic checkbox parse when the LLM is disabled', async () => {
    const svc = makeService({ enabled: false });
    const res = await svc.parseDoc(DOC);
    expect(res.isFallback).toBe(true);
    expect(res.breakdown.tasks).toHaveLength(3);
    // Each task carries a stable anchor == its ref, ready for phase-item tagging.
    for (const t of res.breakdown.tasks) {
      expect(t.anchor).toBeTruthy();
      expect(t.ref).toBe(t.anchor);
    }
  });

  it('returns an empty breakdown for a doc with no checkboxes', async () => {
    const svc = makeService({ enabled: false });
    const res = await svc.parseDoc('# Just prose\n\nNo tasks here.');
    expect(res.breakdown.tasks).toEqual([]);
  });

  it('enriches via the LLM but reconciles anchors back to real doc lines', async () => {
    const generateStructured = vi.fn().mockResolvedValue({
      data: {
        tasks: [
          // anchor matches a real line → kept
          { ref: 'jwt', title: 'Switch to JWTs', anchor: 'Replace session cookies with JWTs', dependsOn: [] },
          // implied-from-prose task with a bogus anchor → anchor dropped
          { ref: 'infra', title: 'Stand up brand new infra', anchor: 'nonexistent line', dependsOn: ['jwt'] },
        ],
      },
    });
    const svc = makeService({
      enabled: true,
      getPlanModel: () => 'opus',
      generateStructured,
    } as Partial<LlmService>);

    const res = await svc.parseDoc(DOC);

    expect(res.isFallback).toBe(false);
    const jwt = res.breakdown.tasks.find((t) => t.ref === 'jwt');
    const infra = res.breakdown.tasks.find((t) => t.ref === 'infra');
    expect(jwt?.anchor).toBe('replace-session-cookies-with-jwts');
    expect(infra?.anchor).toBeUndefined();
    expect(infra?.dependsOn).toEqual(['jwt']); // edge preserved through prune
  });

  it('falls back deterministically when the LLM call throws', async () => {
    const svc = makeService({
      enabled: true,
      getPlanModel: () => 'opus',
      generateStructured: vi.fn().mockRejectedValue(new Error('boom')),
    } as Partial<LlmService>);
    const res = await svc.parseDoc(DOC);
    expect(res.isFallback).toBe(true);
    expect(res.breakdown.tasks).toHaveLength(3);
  });
});
