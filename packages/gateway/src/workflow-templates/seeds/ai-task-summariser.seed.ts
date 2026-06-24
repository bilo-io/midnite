import type { WorkflowTemplateSeed } from './seed-type';

const seed: WorkflowTemplateSeed = {
  slug: 'ai-task-summariser',
  name: 'AI Task Summariser',
  description:
    'On-demand: given a task ID via webhook, fetches the task thread and produces a concise AI summary of progress and next steps.',
  category: 'ai',
  tags: ['ai', 'tasks', 'summary', 'claude'],
  credentialSlots: [],
  definition: {
    trigger: { type: 'webhook' },
    nodes: [
      { id: 'n1', type: 'trigger.webhook', label: 'Summarise request', params: {} },
      {
        id: 'n2',
        type: 'midnite.get-task',
        label: 'Fetch task',
        params: { taskId: '{{ $trigger.taskId }}' },
      },
      {
        id: 'n3',
        type: 'ai.claude',
        label: 'Summarise',
        params: {
          model: 'claude-sonnet-4-6',
          system:
            'You are a senior engineer summarising a coding task. Be concise. Cover: what was done, what is blocked, and the recommended next step. Use plain prose, no lists.',
          prompt:
            'Task title: {{ $n2.task.title }}\n\nStatus: {{ $n2.task.status }}\n\nThread:\n{{ $n2.task.body }}\n\nWrite a 2–3 sentence summary.',
          maxTokens: 300,
        },
      },
      {
        id: 'n4',
        type: 'http.respond',
        label: 'Return summary',
        params: {
          statusCode: 200,
          body: '{{ $n3.text }}',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
    ],
  },
};

export default seed;
