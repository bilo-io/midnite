import { describe, expect, it, vi } from 'vitest';
import type { TaskGraph } from '@midnite/shared';
import { TasksController } from './tasks.controller';
import type { TasksService } from './tasks.service';

const emptyGraph: TaskGraph = { nodes: [], edges: [], truncated: false, totalCount: 0 };

function makeController(buildGraph = vi.fn(() => emptyGraph)) {
  const service = { buildGraph } as unknown as TasksService;
  // graph() only touches `service`; the other injected deps are unused here.
  const controller = new TasksController(
    service,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
  return { controller, buildGraph };
}

describe('TasksController.graph (Phase 58 A)', () => {
  it('passes projectId + the caller’s team scope to the service and wraps the result', () => {
    const { controller, buildGraph } = makeController();
    const res = controller.graph('proj-A', { userId: 'u1', teamId: 't1' });
    expect(buildGraph).toHaveBeenCalledWith('proj-A', { userId: 'u1', teamId: 't1' });
    expect(res).toEqual({ graph: emptyGraph });
  });

  it('trims an empty projectId to undefined and tolerates no user (scope undefined)', () => {
    const { controller, buildGraph } = makeController();
    controller.graph('  ', null);
    expect(buildGraph).toHaveBeenCalledWith(undefined, undefined);
  });
});
