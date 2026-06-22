import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CouncilsService } from '../councils/councils.service';
import type { MemoriesService } from '../memories/memories.service';
import type { NotesService } from '../notes/notes.service';
import type { ProjectsService } from '../projects/projects.service';
import type { TasksService } from '../tasks/tasks.service';
import type { WorkflowsService } from '../workflows/workflows.service';
import { createTestDb, type TestDbHandle } from '../test/db';
import { SearchIndexService } from './search-index.service';
import { SearchService } from './search.service';

// Mutable fixtures so a test can change the "stored" rows between backfill and
// reindex and assert the index follows.
const data = {
  tasks: [] as Array<{ id: string; title: string; prompt: string | null }>,
  projects: [] as Array<{ id: string; name: string; description: string | null }>,
  memories: [] as Array<{ id: string; title: string; content: string }>,
  notes: [] as Array<{ id: string; content: string }>,
  councils: [] as Array<{ id: string; name: string; description: string | null }>,
  workflows: [] as Array<{ id: string; name: string; description?: string }>,
};

function build(): { index: SearchIndexService; service: SearchService } {
  const index = new SearchIndexService(handle.sqlite);
  const service = new SearchService(
    index,
    { listTasks: () => data.tasks } as unknown as TasksService,
    { listProjects: () => data.projects } as unknown as ProjectsService,
    { listMemories: () => data.memories } as unknown as MemoriesService,
    { listNotes: () => data.notes } as unknown as NotesService,
    { listCouncils: () => data.councils } as unknown as CouncilsService,
    { listSummaries: () => data.workflows } as unknown as WorkflowsService,
  );
  return { index, service };
}

let handle: TestDbHandle;

beforeEach(() => {
  handle = createTestDb();
  data.tasks = [{ id: 't1', title: 'Add auth flow', prompt: 'wire up login + signup' }];
  data.projects = [{ id: 'p1', name: 'Billing', description: 'invoices and dunning' }];
  data.memories = [{ id: 'm1', title: 'Conventions', content: 'use kebab-case files' }];
  data.notes = [{ id: 'n1', content: 'rotate the deploy token weekly' }];
  data.councils = [{ id: 'c1', name: 'Architecture', description: 'design reviews' }];
  data.workflows = [{ id: 'w1', name: 'Nightly sync', description: 'pull and rebuild' }];
});

afterEach(() => handle.close());

describe('SearchService — boot backfill', () => {
  it('populates an empty index from every domain on init', () => {
    const { index, service } = build();
    service.onModuleInit();
    expect(index.count()).toBe(6);
    expect(index.query('billing').map((h) => `${h.type}:${h.id}`)).toEqual(['project:p1']);
    expect(index.query('kebab').map((h) => h.type)).toEqual(['memory']);
  });

  it('indexes a note by content with a derived first-line title', () => {
    const { index, service } = build();
    service.onModuleInit();
    const [hit] = index.query('rotate');
    expect(hit?.type).toBe('note');
    // Title derived from the note's first line (with the match highlighted).
    expect(hit?.title).toContain('the deploy token weekly');
    expect(hit?.title).toContain('<mark>rotate</mark>');
  });

  it('does not re-backfill when the index already has rows', () => {
    const { index, service } = build();
    service.onModuleInit();
    data.tasks.push({ id: 't2', title: 'second task', prompt: 'more' });
    service.onModuleInit(); // index non-empty → no-op
    expect(index.count()).toBe(6);
  });
});

describe('SearchService — reindex', () => {
  it('rebuilds from scratch and reflects the current rows', () => {
    const { index, service } = build();
    service.onModuleInit();

    // A task removed and another added since the backfill.
    data.tasks = [{ id: 't9', title: 'Replaced task', prompt: 'fresh prompt about otters' }];
    const result = service.reindex();

    expect(result.indexed).toBe(6);
    expect(index.query('otters').map((h) => h.id)).toEqual(['t9']);
    expect(index.query('auth')).toEqual([]); // the old task is gone
  });
});
