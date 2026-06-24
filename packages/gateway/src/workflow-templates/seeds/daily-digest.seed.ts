import type { WorkflowTemplateSeed } from './seed-type';

const seed: WorkflowTemplateSeed = {
  slug: 'daily-digest',
  name: 'Daily Task Digest',
  description:
    'Sends a morning digest of all work-in-progress and todo tasks to a Slack channel. Runs at 08:00 UTC every weekday.',
  category: 'scheduling',
  tags: ['slack', 'digest', 'daily', 'tasks'],
  credentialSlots: [
    { key: 'slack-workspace', type: 'slack', description: 'Slack bot token with chat:write scope' },
  ],
  definition: {
    trigger: { type: 'schedule', cron: '0 8 * * 1-5' },
    nodes: [
      { id: 'n1', type: 'trigger.schedule', label: 'Weekdays 08:00', params: {} },
      {
        id: 'n2',
        type: 'midnite.list-tasks',
        label: 'WIP tasks',
        params: { status: 'wip' },
      },
      {
        id: 'n3',
        type: 'midnite.list-tasks',
        label: 'Todo tasks',
        params: { status: 'todo' },
      },
      {
        id: 'n4',
        type: 'ai.claude',
        label: 'Draft digest',
        params: {
          model: 'claude-haiku-4-5-20251001',
          system:
            'You are a concise engineering lead. Format a brief daily standup digest from the task lists provided. Use markdown bullet lists.',
          prompt:
            'WIP tasks: {{ $n2.tasks | map("title") | join(", ") }}\n\nTodo tasks: {{ $n3.tasks | map("title") | join(", ") }}\n\nWrite a short digest.',
          maxTokens: 400,
        },
      },
      {
        id: 'n5',
        type: 'slack.message',
        label: 'Post digest',
        params: {
          credentialId: 'slot:slack-workspace',
          channel: '#daily-standup',
          text: ':sunrise: *Daily Digest*\n\n{{ $n4.text }}',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n1', target: 'n3' },
      { id: 'e3', source: 'n2', target: 'n4' },
      { id: 'e4', source: 'n3', target: 'n4' },
      { id: 'e5', source: 'n4', target: 'n5' },
    ],
  },
};

export default seed;
