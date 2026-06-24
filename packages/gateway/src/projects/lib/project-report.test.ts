import { describe, expect, it } from 'vitest';
import type { Memory, Project, Task } from '@midnite/shared';
import { projectToMarkdown, projectReportFilename } from './project-report';

const NOW = new Date('2026-06-23T10:00:00Z');

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'My App',
    description: 'Build the app.',
    tag: 'app',
    color: '#000',
    workDir: '~/code/app',
    sources: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Fix bug',
    kind: 'bug',
    status: 'todo',
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    events: [],
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  } as unknown as Task;
}

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'm1',
    title: 'Design notes',
    content: 'Use a modular design.',
    sources: [],
    projectId: 'p1',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
    ...overrides,
  };
}

describe('projectToMarkdown', () => {
  it('renders the project title and export date', () => {
    const md = projectToMarkdown(makeProject(), [], [], { now: NOW });
    expect(md).toContain('# My App');
    expect(md).toContain('*Exported 2026-06-23*');
  });

  it('includes the description when present', () => {
    const md = projectToMarkdown(makeProject({ description: 'Build the app.' }), [], [], { now: NOW });
    expect(md).toContain('Build the app.');
  });

  it('omits description when absent', () => {
    const md = projectToMarkdown(makeProject({ description: undefined }), [], [], { now: NOW });
    expect(md).not.toMatch(/^Build/m);
  });

  it('groups tasks by status with labels', () => {
    const tasks = [
      makeTask({ id: 't1', title: 'First', status: 'todo', kind: 'feature' }),
      makeTask({ id: 't2', title: 'Second', status: 'done', kind: 'bug' }),
      makeTask({ id: 't3', title: 'Third', status: 'todo', kind: 'chore' }),
    ];
    const md = projectToMarkdown(makeProject(), tasks, [], { now: NOW });
    expect(md).toContain('## Tasks');
    expect(md).toContain('### Todo');
    expect(md).toContain('**First**');
    expect(md).toContain('**Third**');
    expect(md).toContain('### Done');
    expect(md).toContain('**Second**');
    // Backlog section absent when no backlog tasks
    expect(md).not.toContain('### Backlog');
  });

  it('includes kind in task rows', () => {
    const md = projectToMarkdown(makeProject(), [makeTask({ kind: 'feature' })], [], { now: NOW });
    expect(md).toContain('feature');
  });

  it('includes repo when present', () => {
    const md = projectToMarkdown(makeProject(), [makeTask({ repo: 'api' })], [], { now: NOW });
    expect(md).toContain('`api`');
  });

  it('renders sources section with links', () => {
    const project = makeProject({
      sources: [
        { id: 's1', projectId: 'p1', url: 'https://example.com', title: 'Example', kind: 'link', createdAt: '' },
        { id: 's2', projectId: 'p1', url: 'https://github.com/org/repo', kind: 'github', createdAt: '' },
      ],
    });
    const md = projectToMarkdown(project, [], [], { now: NOW });
    expect(md).toContain('## Sources');
    expect(md).toContain('[Example](https://example.com)');
    expect(md).toContain('[https://github.com/org/repo](https://github.com/org/repo)');
  });

  it('omits sources section when no sources', () => {
    const md = projectToMarkdown(makeProject({ sources: [] }), [], [], { now: NOW });
    expect(md).not.toContain('## Sources');
  });

  it('renders memories section with titles and content', () => {
    const memories = [
      makeMemory({ title: 'Design notes', content: 'Use modular design.' }),
    ];
    const md = projectToMarkdown(makeProject(), [], memories, { now: NOW });
    expect(md).toContain('## Knowledge');
    expect(md).toContain('### Design notes');
    expect(md).toContain('Use modular design.');
  });

  it('renders memories without titles as plain content', () => {
    const memories = [makeMemory({ title: '', content: 'Just a note.' })];
    const md = projectToMarkdown(makeProject(), [], memories, { now: NOW });
    expect(md).toContain('Just a note.');
    expect(md).not.toMatch(/###\s*$/m);
  });

  it('omits memories section when empty', () => {
    const md = projectToMarkdown(makeProject(), [], [], { now: NOW });
    expect(md).not.toContain('## Knowledge');
  });

  it('renders a full bundle with tasks + sources + memories', () => {
    const project = makeProject({
      sources: [{ id: 's1', projectId: 'p1', url: 'https://docs.example.com', title: 'Docs', kind: 'link', createdAt: '' }],
    });
    const tasks = [makeTask({ status: 'done', title: 'Deploy', kind: 'feature' })];
    const memories = [makeMemory({ title: 'Notes', content: 'Deploy nightly.' })];
    const md = projectToMarkdown(project, tasks, memories, { now: NOW });
    expect(md).toContain('## Tasks');
    expect(md).toContain('## Sources');
    expect(md).toContain('## Knowledge');
    // Sections appear in order: tasks, sources, memories
    const tasksIdx = md.indexOf('## Tasks');
    const sourcesIdx = md.indexOf('## Sources');
    const memoriesIdx = md.indexOf('## Knowledge');
    expect(tasksIdx).toBeLessThan(sourcesIdx);
    expect(sourcesIdx).toBeLessThan(memoriesIdx);
  });

  it('ends with a single trailing newline', () => {
    const md = projectToMarkdown(makeProject(), [], [], { now: NOW });
    expect(md).toMatch(/\n$/);
    expect(md).not.toMatch(/\n\n$/);
  });
});

describe('projectReportFilename', () => {
  it('slugifies the project name', () => {
    const name = projectReportFilename(makeProject({ name: 'My Cool App!' }));
    expect(name).toMatch(/^my-cool-app-\d{4}-\d{2}-\d{2}\.md$/);
  });

  it('handles a blank name gracefully', () => {
    const name = projectReportFilename(makeProject({ name: '' }));
    expect(name).toMatch(/^project-\d{4}-\d{2}-\d{2}\.md$/);
  });
});
