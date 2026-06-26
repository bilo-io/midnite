import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PhaseDocsController } from './phase-docs.controller';
import {
  GithubUnavailableError,
  PhaseDocConflictError,
  type PhaseDocsService,
} from './phase-docs.service';

const REPO_WITH_SLUG = { id: 'r1', name: 'web', ownerRepo: 'acme/web' };
const REPO_NO_SLUG = { id: 'r2', name: 'local' };

function make(overrides?: {
  service?: Partial<PhaseDocsService>;
  repo?: unknown;
  breakdown?: unknown;
  tasks?: unknown;
}) {
  const service = { list: vi.fn(), get: vi.fn(), ...overrides?.service } as unknown as PhaseDocsService;
  const projects = { getProject: vi.fn() } as never;
  const repos = { get: vi.fn().mockReturnValue(overrides?.repo ?? REPO_WITH_SLUG) } as never;
  const breakdown = (overrides?.breakdown ?? { parseDoc: vi.fn() }) as never;
  const tasks = (overrides?.tasks ?? { createTasksFromBreakdown: vi.fn() }) as never;
  return {
    controller: new PhaseDocsController(service, projects, repos, breakdown, tasks),
    service,
    repos,
    breakdown,
    tasks,
  };
}

describe('PhaseDocsController', () => {
  it('400s when repoId is missing', async () => {
    const { controller } = make();
    await expect(controller.list('p1', undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s when the picked repo has no GitHub slug', async () => {
    const { controller } = make({ repo: REPO_NO_SLUG });
    await expect(controller.list('p1', 'r2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('400s a filename that tries to escape the phases dir', async () => {
    const { controller } = make();
    await expect(controller.get('p1', '../../secrets.md', 'r1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps a conflict from the service to 409', async () => {
    const { controller } = make({
      service: { list: vi.fn().mockRejectedValue(new PhaseDocConflictError('stale')) },
    });
    await expect(controller.list('p1', 'r1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps an unavailable GitHub to 502', async () => {
    const { controller } = make({
      service: { list: vi.fn().mockRejectedValue(new GithubUnavailableError('gh down')) },
    });
    await expect(controller.list('p1', 'r1')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('resolves the owner/repo slug and returns the doc list', async () => {
    const docs = [{ name: 'a.md', path: '.midnite/phases/a.md', sha: 's', content: '' }];
    const { controller, service } = make({ service: { list: vi.fn().mockResolvedValue(docs) } });
    await expect(controller.list('p1', 'r1')).resolves.toEqual({ docs });
    expect(service.list).toHaveBeenCalledWith('acme/web');
  });

  it('seed preview fetches the doc and parses it (creates nothing)', async () => {
    const preview = { breakdown: { tasks: [] }, isFallback: true };
    const parseDoc = vi.fn().mockResolvedValue(preview);
    const { controller, service } = make({
      service: { get: vi.fn().mockResolvedValue({ name: 'a.md', content: '# doc' }) },
      breakdown: { parseDoc },
    });
    await expect(controller.seedPreview('p1', 'a.md', 'r1')).resolves.toEqual(preview);
    expect(service.get).toHaveBeenCalledWith('acme/web', 'a.md');
    expect(parseDoc).toHaveBeenCalledWith('# doc');
  });

  it('seed-tasks creates project-linked tasks tagged with phase-doc + phase-item', () => {
    const createTasksFromBreakdown = vi.fn().mockReturnValue([{ id: 't1' }]);
    const { controller, tasks } = make({ tasks: { createTasksFromBreakdown } });
    const breakdown = {
      tasks: [
        { ref: 'a', title: 'A', anchor: 'do-a', dependsOn: [] },
        { ref: 'b', title: 'B', dependsOn: [] }, // no anchor → only the doc tag
      ],
    };

    const res = controller.seedTasks('p1', 'auth.md', { breakdown });

    expect(res).toEqual({ tasks: [{ id: 't1' }] });
    const opts = createTasksFromBreakdown.mock.calls[0]![1];
    expect(opts.projectId).toBe('p1');
    expect(opts.tagsFor(breakdown.tasks[0])).toEqual(['phase-doc:auth.md', 'phase-item:do-a']);
    expect(opts.tagsFor(breakdown.tasks[1])).toEqual(['phase-doc:auth.md']);
  });

  it('seed-tasks 400s a traversal filename before touching the breakdown', () => {
    const createTasksFromBreakdown = vi.fn();
    const { controller } = make({ tasks: { createTasksFromBreakdown } });
    expect(() => controller.seedTasks('p1', '../evil.md', { breakdown: { tasks: [] } })).toThrow(
      BadRequestException,
    );
    expect(createTasksFromBreakdown).not.toHaveBeenCalled();
  });
});
