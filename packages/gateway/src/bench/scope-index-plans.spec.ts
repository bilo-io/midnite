import { describe, expect, it } from 'vitest';
import { createTestDb, type TestDbHandle } from '../test/db';

/**
 * Phase 57 D — query-plan regression guard for the team-scope hot paths.
 *
 * `teamScopeFilter` is `createdBy = ? OR createdBy IS NULL OR teamId = ?`. Before
 * this slice, `projects` and `workflows` had no matching index and their scoped
 * list queries did a full `SCAN` (and the scope-only tasks list needed the 0048
 * indexes). These assertions pin the plan to an index SEARCH so a future schema
 * change that drops a scope index (or a query that regresses to a scan) fails CI
 * here — cheaper to catch than a production slow-query. Plans are static (SQLite
 * picks indexes by heuristic, no ANALYZE needed), so no large seed is required.
 */

/** The EXPLAIN QUERY PLAN detail lines for a query, joined into one string. */
function plan(h: TestDbHandle, sql: string, params: unknown[]): string {
  const rows = h.sqlite.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...(params as [])) as Array<{
    detail: string;
  }>;
  return rows.map((r) => r.detail).join('\n');
}

const SCOPE = '(created_by = ? OR created_by IS NULL OR team_id = ?)';

describe('team-scope query plans (Phase 57 D)', () => {
  it('listProjects searches both OR arms by index (was a full SCAN)', () => {
    const h = createTestDb();
    const p = plan(
      h,
      `SELECT * FROM projects WHERE ${SCOPE} ORDER BY created_at ASC`,
      ['u1', 't1'],
    );
    expect(p).not.toMatch(/SCAN projects/);
    expect(p).toContain('projects_created_by_idx');
    expect(p).toContain('projects_team_idx');
    h.close();
  });

  it('listWorkflows searches both OR arms by index (was a full SCAN)', () => {
    const h = createTestDb();
    const p = plan(
      h,
      `SELECT * FROM workflows WHERE ${SCOPE} ORDER BY updated_at DESC`,
      ['u1', 't1'],
    );
    expect(p).not.toMatch(/SCAN workflows/);
    expect(p).toContain('workflows_created_by_idx');
    expect(p).toContain('workflows_team_idx'); // the arm this slice added
    h.close();
  });

  it('listTasks (scope only, no status) searches by the scope indexes', () => {
    const h = createTestDb();
    const p = plan(
      h,
      `SELECT * FROM tasks WHERE ${SCOPE} ORDER BY priority DESC, created_at ASC`,
      ['u1', 't1'],
    );
    expect(p).not.toMatch(/SCAN tasks/);
    expect(p).toContain('tasks_created_by_idx');
    expect(p).toContain('tasks_team_id_idx');
    h.close();
  });

  it('listTasks (status filter) still searches by the status index', () => {
    const h = createTestDb();
    const p = plan(
      h,
      `SELECT * FROM tasks WHERE status = ? AND ${SCOPE} ORDER BY priority DESC, created_at ASC`,
      ['todo', 'u1', 't1'],
    );
    expect(p).not.toMatch(/SCAN tasks/);
    expect(p).toMatch(/tasks_status/); // status_idx or status_priority_idx
    h.close();
  });
});
