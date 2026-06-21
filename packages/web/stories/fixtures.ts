import type {
  Memory,
  Project,
  SessionSummary,
  Task,
  TaskLink,
  WorkflowSummary,
} from '@midnite/shared';

import type { OfficeAgent } from '@/lib/office/agents';
import type { ProjectTagInfo } from '@/components/task-card';

/**
 * Static fixtures for Storybook stories. Everything here is a fixed literal so
 * stories render deterministically and fully offline — the one exception is
 * session `lastActivity`, which is an offset from now because the cards render
 * relative time ("12m ago") against the current clock.
 */

// --- Projects ---

export const projectTagInfo: ProjectTagInfo = { tag: 'WEB', color: '#7c3aed' };

export const projectsById = new Map<string, ProjectTagInfo>([
  ['proj-web', { tag: 'WEB', color: '#7c3aed' }],
  ['proj-gw', { tag: 'GATEWAY', color: '#0ea5e9' }],
  ['proj-docs', { tag: 'DOCS', color: '#facc15' }],
]);

export const project: Project = {
  id: 'proj-web',
  name: 'Midnite Web',
  description: 'Next.js kanban front-end: board, sessions, workflows, and the project planner.',
  tag: 'WEB',
  color: '#7c3aed',
  workDir: '~/Dev/midnite/packages/web',
  plan: '# Plan\n\n- [x] Board view\n- [ ] Storybook',
  planUpdatedAt: '2026-06-10T09:00:00.000Z',
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-06-10T09:00:00.000Z',
  taskCount: 12,
  sources: [
    {
      id: 'src-1',
      projectId: 'proj-web',
      url: 'https://github.com/acme/midnite',
      kind: 'github',
      createdAt: '2026-05-01T09:00:00.000Z',
    },
    {
      id: 'src-2',
      projectId: 'proj-web',
      url: 'https://www.figma.com/design/abc/midnite',
      kind: 'figma',
      createdAt: '2026-05-02T09:00:00.000Z',
    },
    {
      id: 'src-3',
      projectId: 'proj-web',
      url: 'https://docs.google.com/document/d/xyz',
      kind: 'google-docs',
      createdAt: '2026-05-03T09:00:00.000Z',
    },
  ],
};

export const projectMinimal: Project = {
  id: 'proj-min',
  name: 'Scratchpad',
  tag: 'SCRATCH',
  color: '#64748b',
  createdAt: '2026-06-01T09:00:00.000Z',
  updatedAt: '2026-06-01T09:00:00.000Z',
  taskCount: 0,
  sources: [],
};

// --- Tasks ---

function link(taskId: string, n: number, url: string, kind: TaskLink['kind']): TaskLink {
  return { id: `${taskId}-link-${n}`, taskId, url, kind, createdAt: '2026-06-01T10:00:00.000Z' };
}

export const taskFeature: Task = {
  id: 'task-feature',
  priority: 2,
  retryCount: 0,
  title: 'Wire the session transcript modal into the board',
  kind: 'feature',
  status: 'wip',
  projectId: 'proj-web',
  tags: ['frontend', 'ui'],
  events: [],
  links: [
    link('task-feature', 1, 'https://github.com/acme/midnite/pull/42', 'github'),
    link('task-feature', 2, 'https://www.figma.com/design/abc/midnite', 'figma'),
  ],
};

export const taskBug: Task = {
  id: 'task-bug',
  priority: 3,
  retryCount: 1,
  title: 'Theme toggle menu clips behind the page header',
  kind: 'bug',
  status: 'todo',
  projectId: 'proj-web',
  tags: ['regression', 'theming'],
  events: [],
  links: [link('task-bug', 1, 'https://github.com/acme/midnite/issues/77', 'github')],
};

export const taskQuestion: Task = {
  id: 'task-question',
  priority: 0,
  retryCount: 0,
  title: 'Should abandoned tasks count toward the project donut?',
  kind: 'question',
  status: 'backlog',
  projectId: 'proj-docs',
  tags: [],
  events: [],
};

// A question resolved inline at intake (Phase 15 Theme C): answered → done, with
// the answer recorded as an `answer` task-event.
export const taskAnsweredQuestion: Task = {
  id: 'task-answered',
  priority: 1,
  retryCount: 0,
  title: 'What does the scheduler tick interval default to?',
  kind: 'question',
  status: 'done',
  tags: [],
  events: [
    { at: '2026-06-22T00:00:00Z', kind: 'task.created' },
    {
      at: '2026-06-22T00:00:01Z',
      kind: 'answer',
      data: { text: 'It defaults to **2000ms**, configurable via `scheduler.tickMs`.' },
    },
  ],
};

export const taskChore: Task = {
  id: 'task-chore',
  priority: 1,
  retryCount: 0,
  title: 'Bump drizzle-kit and regenerate migration metadata',
  kind: 'chore',
  status: 'waiting',
  projectId: 'proj-gw',
  tags: [],
  events: [],
};

export const taskUnknown: Task = {
  id: 'task-unknown',
  priority: 1,
  retryCount: 0,
  title: 'Investigate flaky heartbeat scheduler test',
  status: 'backlog',
  tags: [],
  events: [],
};

export const taskDone: Task = {
  id: 'task-done',
  priority: 1,
  retryCount: 0,
  title: 'Two-stage page reveal animation',
  kind: 'feature',
  status: 'done',
  projectId: 'proj-web',
  tags: [],
  events: [],
};

export const taskAbandoned: Task = {
  id: 'task-abandoned',
  priority: 2,
  retryCount: 3,
  title: 'Tailwind v4 migration spike',
  kind: 'chore',
  status: 'abandoned',
  projectId: 'proj-web',
  archivedAt: '2026-06-01T12:00:00.000Z',
  tags: [],
  events: [],
};

/** A spread of tasks across every status, sized for the board view. */
export const tasks: Task[] = [
  taskQuestion,
  taskAnsweredQuestion,
  taskUnknown,
  taskBug,
  { ...taskBug, id: 'task-bug-2', title: 'Source icon favicon fallback flashes on load', projectId: 'proj-gw' },
  taskFeature,
  { ...taskFeature, id: 'task-feature-2', title: 'Workflow run-state borders on canvas nodes', links: undefined },
  taskChore,
  taskDone,
  { ...taskDone, id: 'task-done-2', title: 'Favicon + dark mode polish', kind: 'bug', projectId: 'proj-docs' },
  taskAbandoned,
];

// --- Sessions ---

const NOW = Date.now();

export const sessionRunning: SessionSummary = {
  id: 'sess-running',
  projectSlug: 'midnite',
  projectDisplay: 'midnite',
  title: 'Fix board drag-and-drop ordering',
  subtitle: 'packages/web — feature/board-dnd',
  status: 'running',
  lastActivity: NOW - 90_000,
  contextTokens: 84_000,
  contextLimit: 200_000,
};

export const sessionWaiting: SessionSummary = {
  id: 'sess-waiting',
  projectSlug: 'midnite',
  projectDisplay: 'midnite',
  title: 'Add terminal REST controller',
  subtitle: 'packages/gateway — awaiting permission approval',
  status: 'waiting',
  lastActivity: NOW - 12 * 60_000,
  contextTokens: 132_000,
  contextLimit: 200_000,
};

export const sessionCompleted: SessionSummary = {
  id: 'sess-completed',
  projectSlug: 'ekko',
  projectDisplay: 'ekko',
  title: 'Refactor OpenGraph fetcher',
  subtitle: 'packages/gateway',
  status: 'completed',
  lastActivity: NOW - 3 * 3_600_000,
  contextTokens: 187_000,
  contextLimit: 200_000,
};

export const sessionIdle: SessionSummary = {
  id: 'sess-idle',
  projectSlug: 'scratch',
  projectDisplay: 'scratch',
  title: 'Spike: memory search indexing',
  subtitle: '',
  status: 'idle',
  lastActivity: NOW - 2 * 86_400_000,
};

export const sessions: SessionSummary[] = [
  sessionRunning,
  sessionWaiting,
  sessionCompleted,
  sessionIdle,
];

// --- Workflows ---

export const workflowScheduled: WorkflowSummary = {
  id: 'wf-nightly',
  name: 'Nightly triage',
  description: 'Labels stale tasks and pings the board channel with a digest.',
  enabled: true,
  triggerType: 'schedule',
  cron: '0 2 * * *',
  nodeCount: 4,
  steps: [
    { type: 'trigger.schedule', label: 'Nightly' },
    { type: 'ai.claude', label: 'Triage' },
    { type: 'logic.branch' },
    { type: 'http.request', label: 'Notify' },
  ],
  lastRunAt: '2026-06-11T02:00:00.000Z',
  lastRunStatus: 'succeeded',
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-06-11T02:00:00.000Z',
};

export const workflowWebhook: WorkflowSummary = {
  id: 'wf-deploy',
  name: 'Deploy notifier',
  description: 'Posts a summary when the deploy webhook fires.',
  enabled: true,
  triggerType: 'webhook',
  nodeCount: 7,
  steps: [
    { type: 'trigger.webhook' },
    { type: 'logic.branch' },
    { type: 'http.request' },
    { type: 'ai.claude' },
    { type: 'http.request' },
    { type: 'logic.branch' },
    { type: 'http.request', label: 'Post' },
  ],
  lastRunAt: '2026-06-10T16:30:00.000Z',
  lastRunStatus: 'failed',
  createdAt: '2026-05-10T09:00:00.000Z',
  updatedAt: '2026-06-10T16:30:00.000Z',
};

export const workflowManual: WorkflowSummary = {
  id: 'wf-release',
  name: 'Release checklist',
  enabled: false,
  triggerType: 'manual',
  nodeCount: 2,
  steps: [
    { type: 'trigger.manual', label: 'Start' },
    { type: 'http.request', label: 'Run' },
  ],
  createdAt: '2026-06-01T09:00:00.000Z',
  updatedAt: '2026-06-01T09:00:00.000Z',
};

// --- Markdown ---

export const markdownKitchenSink = `# Heading one

Some lead paragraph with **bold**, _italic_, ~~strikethrough~~, \`inline code\`,
and a [link](https://example.com).

## Heading two

> A blockquote with a thought worth keeping.

### Section label

- Bullet one
- Bullet two
  1. Nested ordered
  2. Another

#### Task list

- [x] Shipped
- [ ] Not yet

| Column | Baseline | Target |
| --- | --- | --- |
| Speed | 4s | 1s |
| Errors | 12 | 0 |

\`\`\`ts
export function add(a: number, b: number): number {
  return a + b;
}
\`\`\`

---

Done.
`;

// --- Memories ---

export const memoryGlobal: Memory = {
  id: 'mem-style',
  title: 'House TypeScript style',
  content:
    '# House style\n\nPrefer `type` for object shapes; discriminated unions for state.\nAlways `import type` for type-only imports.',
  projectId: null,
  sources: [
    {
      id: 'mem-src-1',
      memoryId: 'mem-style',
      url: 'https://github.com/acme/midnite/blob/main/CLAUDE.md',
      kind: 'github',
      createdAt: '2026-05-01T09:00:00.000Z',
    },
  ],
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-06-09T09:00:00.000Z',
};

export const memoryProjectScoped: Memory = {
  id: 'mem-web-routing',
  title: 'Web routing conventions',
  content:
    '# Routing\n\nApp Router only. Server components by default; mark client components with `use client`.',
  projectId: 'proj-web',
  sources: [],
  createdAt: '2026-05-20T09:00:00.000Z',
  updatedAt: '2026-06-12T09:00:00.000Z',
};

export const memoryArchived: Memory = {
  id: 'mem-old',
  title: 'Legacy Vite build notes',
  content: 'Superseded by the Next.js migration — kept for reference.',
  projectId: 'proj-web',
  sources: [],
  archived: true,
  createdAt: '2026-04-01T09:00:00.000Z',
  updatedAt: '2026-04-30T09:00:00.000Z',
};

export const memories: Memory[] = [memoryGlobal, memoryProjectScoped, memoryArchived];

// --- Office agents ---
// Desk occupants for the office HUD, derived from the session fixtures above.

export const officeAgentRunning: OfficeAgent = {
  id: sessionRunning.id,
  name: sessionRunning.title,
  project: sessionRunning.projectDisplay,
  status: sessionRunning.status,
  activity: sessionRunning.subtitle,
  session: sessionRunning,
};

export const officeAgentWaiting: OfficeAgent = {
  id: sessionWaiting.id,
  name: sessionWaiting.title,
  project: sessionWaiting.projectDisplay,
  status: sessionWaiting.status,
  activity: sessionWaiting.subtitle,
  session: sessionWaiting,
};

export const officeAgents: OfficeAgent[] = [officeAgentRunning, officeAgentWaiting];
