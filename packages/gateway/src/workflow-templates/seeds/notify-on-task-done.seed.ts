import type { WorkflowTemplateSeed } from './seed-type';

const seed: WorkflowTemplateSeed = {
  slug: 'notify-on-task-done',
  name: 'Notify on Task Done',
  description: 'Sends a Slack message when a midnite task transitions to done. Wire the webhook URL to a midnite task event.',
  category: 'notifications',
  tags: ['slack', 'task', 'done'],
  credentialSlots: [
    { key: 'slack-workspace', type: 'slack', description: 'Slack bot token with chat:write scope' },
  ],
  definition: {
    trigger: { type: 'webhook' },
    nodes: [
      { id: 'n1', type: 'trigger.webhook', label: 'Task webhook', params: {} },
      {
        id: 'n2',
        type: 'logic.if',
        label: 'Is done?',
        params: { condition: "{{ $trigger.status === 'done' }}" },
      },
      {
        id: 'n3',
        type: 'slack.message',
        label: 'Notify Slack',
        params: {
          credentialId: 'slot:slack-workspace',
          channel: '#general',
          text: '✅ Task *{{ $trigger.title }}* is done!',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'true' },
    ],
  },
};

export default seed;
