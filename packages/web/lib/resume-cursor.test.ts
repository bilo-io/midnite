import { describe, expect, it } from 'vitest';

import { ResumeTracker } from './resume-cursor';

// A minimal envelope parser standing in for the real Sequenced*EventSchema — the
// tracker only needs { seq, ch?, event } | null.
type Evt = { n: number };
function parse(raw: unknown): { seq: number; ch?: string; event: Evt } | null {
  if (raw && typeof raw === 'object' && 'seq' in raw && 'event' in raw) {
    const r = raw as { seq: number; ch?: string; event: Evt };
    return { seq: r.seq, ch: r.ch, event: r.event };
  }
  return null;
}
const evt = (seq: number, ch: string, n = seq) => ({ seq, ch, event: { n } });

describe('ResumeTracker (Phase 56 B)', () => {
  it('a fresh tracker subscribes; once it has a cursor it resumes with it', () => {
    const t = new ResumeTracker(parse);
    expect(t.subscribeMessage()).toEqual({ type: 'subscribe' });

    t.accept(evt(3, 'tasks:all'));
    expect(t.subscribeMessage()).toEqual({ type: 'resume', cursor: { 'tasks:all': 3 } });
  });

  it('merges channel-specific extras into the subscribe/resume frame', () => {
    const t = new ResumeTracker(parse);
    expect(t.subscribeMessage({ runId: 'r1' })).toEqual({ type: 'subscribe', runId: 'r1' });
  });

  it('classifies a first-seen event as apply and advances the per-channel cursor', () => {
    const t = new ResumeTracker(parse);
    expect(t.accept(evt(1, 'tasks:all'))).toEqual({ kind: 'event', ch: 'tasks:all', event: { n: 1 } });
    expect(t.accept(evt(2, 'tasks:all'))).toEqual({ kind: 'event', ch: 'tasks:all', event: { n: 2 } });
  });

  it('drops an already-applied seq as a duplicate (idempotent replay+live overlap)', () => {
    const t = new ResumeTracker(parse);
    t.accept(evt(5, 'tasks:all'));
    expect(t.accept(evt(5, 'tasks:all')).kind).toBe('duplicate');
    expect(t.accept(evt(3, 'tasks:all')).kind).toBe('duplicate'); // older replay
    expect(t.accept(evt(6, 'tasks:all')).kind).toBe('event'); // newer applies
  });

  it('tracks channels independently — a seq on one line does not gate the other', () => {
    const t = new ResumeTracker(parse);
    t.accept(evt(10, 'tasks:team:T'));
    // The all line is still at 0, so a low seq there applies.
    expect(t.accept(evt(1, 'tasks:all')).kind).toBe('event');
    expect(t.subscribeMessage()).toEqual({
      type: 'resume',
      cursor: { 'tasks:team:T': 10, 'tasks:all': 1 },
    });
  });

  it('a watermark anchors the cursor without emitting an event', () => {
    const t = new ResumeTracker(parse);
    expect(t.accept({ type: 'watermark', cursor: { 'tasks:all': 7 } })).toEqual({ kind: 'watermark' });
    // Anchored: seq <= 7 is a duplicate, > 7 applies.
    expect(t.accept(evt(7, 'tasks:all')).kind).toBe('duplicate');
    expect(t.accept(evt(8, 'tasks:all')).kind).toBe('event');
  });

  it('resync-required (scoped) resets that line so future live events re-anchor it', () => {
    const t = new ResumeTracker(parse);
    t.accept(evt(50, 'tasks:all'));
    expect(t.accept({ type: 'resync-required', ch: 'tasks:all' })).toEqual({
      kind: 'resync',
      ch: 'tasks:all',
    });
    // After a reset (e.g. gateway restart → seq back to 1), a low seq applies again.
    expect(t.accept(evt(1, 'tasks:all')).kind).toBe('event');
  });

  it('resync-required (unscoped) clears every line', () => {
    const t = new ResumeTracker(parse);
    t.accept(evt(9, 'tasks:all'));
    t.accept(evt(9, 'tasks:team:T'));
    expect(t.accept({ type: 'resync-required' }).kind).toBe('resync');
    expect(t.subscribeMessage()).toEqual({ type: 'subscribe' }); // cursor emptied → fresh
  });

  it('ignores frames that are neither a control message nor a sequenced event', () => {
    const t = new ResumeTracker(parse);
    expect(t.accept({ hello: 'world' }).kind).toBe('ignore');
    expect(t.accept(null).kind).toBe('ignore');
  });
});
