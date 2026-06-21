// Canonical valid fixtures for the shared domain types.
//
// These are *complete* objects — every defaulted field is spelled out — so
// `Schema.parse(fixture)` deep-equals the fixture (identity, no surprise
// coercion). Reusable by gateway/web tests via the `@midnite/shared/fixtures`
// subpath so we don't hand-roll fakes everywhere. Intentionally NOT re-exported
// from the package root (./index.ts) — this is a test-only entry.
//
// Keep fixtures minimal-but-realistic and in sync with the schemas they mirror;
// `__fixtures__/fixtures.test.ts` validates each one against its schema.

import type { Memory } from '../memory.js';
import type { Media } from '../media.js';
import type { Note } from '../note.js';
import type { Project } from '../project.js';
import type { Routine } from '../routine.js';
import type { NodeRun, WorkflowRun } from '../run.js';
import type { SessionSummary, SessionTranscript } from '../session.js';
import type { Task } from '../task.js';
import type {
  ManualTrigger,
  ScheduleTrigger,
  WebhookTrigger,
} from '../trigger.js';
import type { UsageRecord } from '../usage.js';
import type { WorkflowEdge, WorkflowNode } from '../node.js';
import type { Workflow } from '../workflow.js';
import type { TaskBoardEvent } from '../events/task.js';
import type {
  ClientTerminalMessage,
  ServerTerminalMessage,
} from '../events/terminal.js';
import type { WorkflowEvent } from '../events/workflow.js';

const TS = '2026-06-20T00:00:00.000Z';

export const taskFixture: Task = {
  id: 'task-1',
  title: 'Fix the flaky login test',
  kind: 'bug',
  status: 'todo',
  priority: 1,
  retryCount: 0,
  tags: [],
  events: [],
};

export const sessionSummaryFixture: SessionSummary = {
  id: 'session-1',
  projectSlug: 'midnite',
  projectDisplay: 'Midnite',
  title: 'Fix the flaky login test',
  subtitle: 'on main',
  status: 'running',
  lastActivity: 1_700_000_000_000,
};

export const sessionTranscriptFixture: SessionTranscript = {
  id: 'session-1',
  title: 'Fix the flaky login test',
  projectDisplay: 'Midnite',
  status: 'completed',
  messages: [
    {
      uuid: 'msg-1',
      role: 'assistant',
      timestamp: 1_700_000_000_000,
      text: 'Patched the test.',
      toolCalls: [{ name: 'Edit', summary: 'edited login.test.ts' }],
    },
  ],
};

export const projectFixture: Project = {
  id: 'project-1',
  name: 'Midnite',
  tag: 'mid',
  color: '#7c3aed',
  workDir: '~/Dev/midnite',
  createdAt: TS,
  updatedAt: TS,
  sources: [],
};

export const memoryFixture: Memory = {
  id: 'memory-1',
  title: 'Deploy steps',
  content: '# Deploy\n1. build\n2. ship',
  projectId: null,
  sources: [],
  createdAt: TS,
  updatedAt: TS,
};

export const noteFixture: Note = {
  id: 'note-1',
  content: 'Remember to rotate the keys',
  completed: false,
  position: 0,
  createdAt: TS,
  updatedAt: TS,
};

export const mediaFixture: Media = {
  id: 'media-1',
  type: 'image',
  title: 'Architecture diagram',
  filePath: '/uploads/media-1.png',
  mimeType: 'image/png',
  fileSize: 2048,
  tags: [],
  createdAt: TS,
  updatedAt: TS,
};

export const routineFixture: Routine = {
  id: 'routine-1',
  name: 'Morning',
  groups: [
    {
      id: 'group-1',
      routineId: 'routine-1',
      name: 'Health',
      position: 0,
      items: [
        {
          id: 'item-1',
          groupId: 'group-1',
          title: 'Stretch',
          position: 0,
          createdAt: TS,
          updatedAt: TS,
        },
      ],
      createdAt: TS,
      updatedAt: TS,
    },
  ],
  createdAt: TS,
  updatedAt: TS,
};

export const workflowNodeFixture: WorkflowNode = {
  id: 'node-1',
  type: 'manual',
  label: 'Start',
  position: { x: 0, y: 0 },
  params: {},
};

export const workflowEdgeFixture: WorkflowEdge = {
  id: 'edge-1',
  source: 'node-1',
  sourcePort: 'main',
  target: 'node-2',
  targetPort: 'main',
};

export const manualTriggerFixture: ManualTrigger = { type: 'manual' };
export const scheduleTriggerFixture: ScheduleTrigger = {
  type: 'schedule',
  cron: '0 0 * * *',
  timezone: 'UTC',
};
export const webhookTriggerFixture: WebhookTrigger = {
  type: 'webhook',
  method: 'POST',
  hasSecret: false,
};

export const workflowFixture: Workflow = {
  id: 'workflow-1',
  name: 'Nightly sync',
  enabled: false,
  trigger: manualTriggerFixture,
  nodes: [workflowNodeFixture],
  edges: [],
  createdAt: TS,
  updatedAt: TS,
};

export const nodeRunFixture: NodeRun = {
  id: 'noderun-1',
  runId: 'run-1',
  nodeId: 'node-1',
  nodeType: 'manual',
  status: 'succeeded',
  logs: [],
};

export const workflowRunFixture: WorkflowRun = {
  id: 'run-1',
  workflowId: 'workflow-1',
  status: 'succeeded',
  triggerSource: 'manual',
  startedAt: TS,
  nodeRuns: [nodeRunFixture],
};

export const usageRecordFixture: UsageRecord = {
  id: 'usage-1',
  at: TS,
  provider: 'anthropic',
  model: 'opus',
  feature: 'classifier',
  inputTokens: 120,
  outputTokens: 48,
  estCostUsd: 0.0021,
};

// ── WS event-union fixtures: one per discriminant ────────────────────────────

export const taskBoardEventFixtures: TaskBoardEvent[] = [
  { type: 'task.created', at: TS, task: taskFixture },
  { type: 'task.updated', at: TS, task: taskFixture },
  { type: 'task.deleted', at: TS, id: taskFixture.id },
  { type: 'tasks.bulkCreated', at: TS, taskIds: [taskFixture.id] },
];

export const workflowEventFixtures: WorkflowEvent[] = [
  { type: 'run.started', workflowId: 'workflow-1', runId: 'run-1', at: TS, triggerSource: 'manual' },
  { type: 'node.started', workflowId: 'workflow-1', runId: 'run-1', at: TS, nodeId: 'node-1', nodeType: 'manual' },
  { type: 'node.succeeded', workflowId: 'workflow-1', runId: 'run-1', at: TS, nodeId: 'node-1', output: { ok: true } },
  { type: 'node.failed', workflowId: 'workflow-1', runId: 'run-1', at: TS, nodeId: 'node-1', error: 'boom' },
  { type: 'run.finished', workflowId: 'workflow-1', runId: 'run-1', at: TS, run: workflowRunFixture },
  { type: 'run.failed', workflowId: 'workflow-1', runId: 'run-1', at: TS, error: 'boom' },
];

export const clientTerminalMessageFixtures: ClientTerminalMessage[] = [
  { type: 'attach', sessionId: 'session-1', token: 'tok', cols: 80, rows: 24 },
  { type: 'input', data: 'bHM=' },
  { type: 'resize', cols: 100, rows: 40 },
  { type: 'approval-response', requestId: 'req-1', decision: 'allow' },
];

export const serverTerminalMessageFixtures: ServerTerminalMessage[] = [
  { type: 'output', data: 'b3V0', seq: 0 },
  { type: 'status', phase: 'ready' },
  { type: 'error', code: 'internal', message: 'oops' },
  {
    type: 'approval-request',
    requestId: 'req-1',
    toolName: 'Bash',
    summary: 'Bash: rm -rf build/',
    options: ['allow', 'allow-session', 'deny'],
  },
  { type: 'approval-resolved', requestId: 'req-1', decision: 'allow' },
];
