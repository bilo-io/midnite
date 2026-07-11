import { describe, expect, it } from 'vitest';
import type { Workflow } from '@midnite/shared';
import type { WorkflowRow, WorkflowRunRow } from '../db/schema';
import { WorkflowsRepository } from './workflows.repository';
import { WorkflowsService } from './workflows.service';

// In-memory repo so listSummaries is tested without SQLite or the engine.
class FakeRepo extends WorkflowsRepository {
  constructor(private readonly workflows: Workflow[]) {
    super({} as never);
  }
  override listWorkflowRows(): WorkflowRow[] {
    return this.workflows.map((w) => ({ id: w.id }) as WorkflowRow);
  }
  // The service pages via listWorkflowPage now (Phase 57 C follow-up).
  override listWorkflowPage(
    _scope?: unknown,
    opts?: { page?: number; limit?: number },
  ): { rows: WorkflowRow[]; total: number } {
    const all = this.workflows.map((w) => ({ id: w.id }) as WorkflowRow);
    const rows =
      opts?.limit != null
        ? all.slice(((opts.page ?? 1) - 1) * opts.limit, ((opts.page ?? 1) - 1) * opts.limit + opts.limit)
        : all;
    return { rows, total: all.length };
  }
  override hydrateWorkflow(row: WorkflowRow): Workflow {
    return this.workflows.find((w) => w.id === row.id)!;
  }
  override latestRunRow(): WorkflowRunRow | undefined {
    return undefined;
  }
  // listSummaries now batches the latest-run lookup (Phase 57 B); no runs seeded here.
  override latestRunRowsByWorkflowIds(): Map<string, WorkflowRunRow> {
    return new Map();
  }
}

function makeService(workflows: Workflow[]): WorkflowsService {
  return new WorkflowsService(new FakeRepo(workflows), {} as never, {} as never);
}

const workflow: Workflow = {
  id: 'w1',
  name: 'Deploy',
  enabled: true,
  trigger: { type: 'manual' },
  nodes: [
    { id: 'n1', type: 'trigger.manual', label: 'Start', position: { x: 0, y: 0 }, params: {} },
    { id: 'n2', type: 'http.request', position: { x: 1, y: 0 }, params: {} },
    { id: 'n3', type: 'ai.claude', label: 'Summarise', position: { x: 2, y: 0 }, params: {} },
  ],
  edges: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('WorkflowsService.listSummaries', () => {
  it('includes an ordered step breakdown (node type + label) alongside the count', () => {
    const [summary] = makeService([workflow]).listSummaries();
    expect(summary?.nodeCount).toBe(3);
    expect(summary?.steps).toEqual([
      { type: 'trigger.manual', label: 'Start' },
      { type: 'http.request', label: undefined },
      { type: 'ai.claude', label: 'Summarise' },
    ]);
  });

  it('listSummaryPage returns { items, total }; listSummaries stays the full array (Phase 57 C)', () => {
    const two: Workflow[] = [workflow, { ...workflow, id: 'w2', name: 'Build' }];
    const svc = makeService(two);
    // Array method unchanged for internal callers.
    expect(svc.listSummaries()).toHaveLength(2);
    // Page method: total is the full set; a window returns just that slice.
    const page = svc.listSummaryPage(undefined, { page: 1, limit: 1 });
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
  });
});
