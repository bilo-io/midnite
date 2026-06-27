import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { phaseItemAnchor, type PhaseDoc, type Project, type Task } from '@midnite/shared';
import { TaskEventBus } from '../tasks/task-event-bus';
import type { ProjectsService } from '../projects/projects.service';
import type { ReposService } from '../repos/repos.service';
import { PhaseDocConflictError, type PhaseDocsService } from './phase-docs.service';
import { PhaseDocSyncService } from './phase-doc-sync.service';

const DOC_BODY = ['# Phase', '', '- [ ] Build the thing', '- [ ] Test the thing', ''].join('\n');
const FILENAME = 'phase-1.md';
const OWNER_REPO = 'acme/widgets';

function phaseDoc(content: string, sha = 'sha-1'): PhaseDoc {
  return { name: FILENAME, path: `.midnite/phases/${FILENAME}`, sha, content, updatedAt: '2026-06-27' };
}

function task(overrides: Partial<Task> & { status: Task['status'] }): Task {
  return {
    id: 't1',
    title: 'Build the thing',
    projectId: 'proj-1',
    tags: [`phase-doc:${FILENAME}`, `phase-item:${phaseItemAnchor('- [ ] Build the thing')}`],
    ...overrides,
  } as unknown as Task;
}

/** Subclass: a long debounce so the real timer never fires mid-test; we drive flushNow(). */
class TestSync extends PhaseDocSyncService {
  constructor(bus: TaskEventBus, docs: PhaseDocsService, projects: ProjectsService, repos: ReposService) {
    super(bus, docs, projects, repos);
    this.debounceMs = 10_000;
  }
}

describe('PhaseDocSyncService', () => {
  let bus: TaskEventBus;
  let docs: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let projects: { getProject: ReturnType<typeof vi.fn> };
  let repos: { get: ReturnType<typeof vi.fn> };
  let service: TestSync;
  let project: Project;

  function emit(t: Task): void {
    bus.emit({ type: 'task.updated', at: '2026-06-27T00:00:00.000Z', task: t });
  }

  beforeEach(() => {
    bus = new TaskEventBus();
    docs = { get: vi.fn().mockResolvedValue(phaseDoc(DOC_BODY)), update: vi.fn().mockResolvedValue(phaseDoc(DOC_BODY)) };
    project = {
      phaseDocSync: true,
      phaseDocSyncRepoId: 'repo-1',
    } as unknown as Project;
    projects = { getProject: vi.fn(() => project) };
    repos = { get: vi.fn(() => ({ ownerRepo: OWNER_REPO })) };
    service = new TestSync(
      bus,
      docs as unknown as PhaseDocsService,
      projects as unknown as ProjectsService,
      repos as unknown as ReposService,
    );
    service.onApplicationBootstrap();
  });

  afterEach(() => service.onModuleDestroy());

  it('ticks the matching checkbox when a seeded task reaches done', async () => {
    emit(task({ status: 'done' }));
    await service.flushNow();
    expect(docs.update).toHaveBeenCalledTimes(1);
    const [owner, file, content, sha] = docs.update.mock.calls[0]!;
    expect(owner).toBe(OWNER_REPO);
    expect(file).toBe(FILENAME);
    expect(content).toContain('- [x] Build the thing');
    expect(content).toContain('- [ ] Test the thing'); // sibling untouched
    expect(sha).toBe('sha-1');
  });

  it('un-ticks when a task leaves done (reopened)', async () => {
    docs.get.mockResolvedValue(phaseDoc('- [x] Build the thing\n- [ ] Test the thing\n'));
    emit(task({ status: 'wip' }));
    await service.flushNow();
    expect(docs.update).toHaveBeenCalledTimes(1);
    expect(docs.update.mock.calls[0]![2]).toContain('- [ ] Build the thing');
  });

  it('skips the write when the line is already in the desired state (idempotent)', async () => {
    docs.get.mockResolvedValue(phaseDoc('- [x] Build the thing\n- [ ] Test the thing\n'));
    emit(task({ status: 'done' }));
    await service.flushNow();
    expect(docs.update).not.toHaveBeenCalled();
  });

  it('logs and skips when no line matches the anchor', async () => {
    emit(task({ status: 'done', tags: [`phase-doc:${FILENAME}`, 'phase-item:nonexistent'] }));
    await service.flushNow();
    expect(docs.get).toHaveBeenCalled();
    expect(docs.update).not.toHaveBeenCalled();
  });

  it('short-circuits when sync is disabled for the project (no GitHub read)', async () => {
    project.phaseDocSync = false;
    emit(task({ status: 'done' }));
    await service.flushNow();
    expect(docs.get).not.toHaveBeenCalled();
    expect(docs.update).not.toHaveBeenCalled();
  });

  it('skips when the project has no sync repo configured', async () => {
    project.phaseDocSyncRepoId = null;
    emit(task({ status: 'done' }));
    await service.flushNow();
    expect(docs.get).not.toHaveBeenCalled();
  });

  it('ignores tasks without phase-doc tags', async () => {
    emit(task({ status: 'done', tags: ['some-other-tag'] }));
    await service.flushNow();
    expect(docs.get).not.toHaveBeenCalled();
  });

  it('coalesces a burst on one doc into a single commit', async () => {
    emit(task({ id: 't1', status: 'done' })); // Build the thing
    emit(
      task({
        id: 't2',
        status: 'done',
        tags: [`phase-doc:${FILENAME}`, `phase-item:${phaseItemAnchor('- [ ] Test the thing')}`],
      }),
    );
    await service.flushNow();
    expect(docs.update).toHaveBeenCalledTimes(1);
    const content = docs.update.mock.calls[0]![2];
    expect(content).toContain('- [x] Build the thing');
    expect(content).toContain('- [x] Test the thing');
  });

  it('retries once on a stale-SHA conflict, then succeeds', async () => {
    docs.update.mockRejectedValueOnce(new PhaseDocConflictError('stale')).mockResolvedValueOnce(phaseDoc(DOC_BODY));
    emit(task({ status: 'done' }));
    await service.flushNow();
    expect(docs.get).toHaveBeenCalledTimes(2); // refetched fresh sha
    expect(docs.update).toHaveBeenCalledTimes(2);
  });

  it('never throws into the event path when GitHub read fails', async () => {
    docs.get.mockRejectedValue(new Error('gh down'));
    emit(task({ status: 'done' }));
    await expect(service.flushNow()).resolves.toBeUndefined();
  });
});
