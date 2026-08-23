import { describe, expect, it } from 'vitest';

import type { GithubProjectFieldOption } from '@midnite/shared';

import { defaultStatusMappings, optionIdForStatus } from './status-mapping';

// The default mapping's job is to be a *useful and obviously correctable* guess. The
// failure that actually matters isn't a missed match — it's a confident wrong one, which
// silently files work under a column nobody chose.

const opts = (...names: string[]): GithubProjectFieldOption[] =>
  names.map((name, i) => ({ id: `opt-${i}`, name }));

const byStatus = (mappings: ReturnType<typeof defaultStatusMappings>) =>
  Object.fromEntries(mappings.map((m) => [m.status, m.optionName]));

describe('defaultStatusMappings', () => {
  it('maps a conventional GitHub board', () => {
    const result = byStatus(defaultStatusMappings(opts('Todo', 'In Progress', 'Done')));
    expect(result).toMatchObject({ todo: 'Todo', wip: 'In Progress', done: 'Done' });
  });

  it('is case- and punctuation-insensitive', () => {
    const result = byStatus(defaultStatusMappings(opts('TO DO', 'in-progress', 'DONE')));
    expect(result).toMatchObject({ todo: 'TO DO', wip: 'in-progress', done: 'DONE' });
  });

  it('matches a decorated column name by containment', () => {
    const result = byStatus(defaultStatusMappings(opts('🚧 In Progress', '✅ Done')));
    expect(result).toMatchObject({ wip: '🚧 In Progress', done: '✅ Done' });
  });

  it('leaves a status unmapped rather than guessing at a distance', () => {
    // No column resembles "waiting"/"blocked" — an unmapped status is a no-op push, and
    // that is far better than filing a blocked task under "Done".
    const mappings = defaultStatusMappings(opts('Todo', 'In Progress', 'Done'));
    expect(optionIdForStatus(mappings, 'waiting')).toBeUndefined();
  });

  it('maps nothing at all when no column resembles any status', () => {
    expect(defaultStatusMappings(opts('Red', 'Amber', 'Green'))).toEqual([]);
  });

  it('never gives one column to two statuses', () => {
    // A board with a single "Closed" column must not have both done and abandoned
    // driving it — the second push would silently undo nothing and confuse the mapping UI.
    const mappings = defaultStatusMappings(opts('Todo', 'Closed'));
    const optionIds = mappings.map((m) => m.optionId);
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });

  it('gives Todo to `todo`, not to `backlog`, on a board with no Backlog column', () => {
    // Regression: statuses are claimed in STATUSES order, so when `backlog` was allowed to
    // fall back to "Todo" it took the column out from under `todo` on every conventional
    // GitHub board. No status borrows another's names.
    const withoutBacklog = byStatus(defaultStatusMappings(opts('Todo', 'In Progress', 'Done')));
    expect(withoutBacklog.todo).toBe('Todo');
    expect(withoutBacklog.backlog).toBeUndefined();
  });

  it('maps a real Backlog column when the board has one', () => {
    const withBacklog = byStatus(defaultStatusMappings(opts('Backlog', 'Todo', 'Done')));
    expect(withBacklog).toMatchObject({ backlog: 'Backlog', todo: 'Todo' });
  });

  it('recognises review-ish columns as waiting', () => {
    const result = byStatus(defaultStatusMappings(opts('Todo', 'In Review', 'Done')));
    expect(result).toMatchObject({ waiting: 'In Review' });
  });

  it('handles an empty option list', () => {
    expect(defaultStatusMappings([])).toEqual([]);
  });

  it('returns option name alongside id, so the UI needs no second round-trip', () => {
    const [first] = defaultStatusMappings(opts('Todo'));
    expect(first).toMatchObject({ optionId: 'opt-0', optionName: 'Todo' });
  });
});

describe('optionIdForStatus', () => {
  it('finds a mapped status and returns undefined for an unmapped one', () => {
    const mappings = defaultStatusMappings(opts('Todo', 'In Progress'));
    expect(optionIdForStatus(mappings, 'wip')).toBe('opt-1');
    expect(optionIdForStatus(mappings, 'abandoned')).toBeUndefined();
  });
});
