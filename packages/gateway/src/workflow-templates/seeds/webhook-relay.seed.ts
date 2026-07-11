import type { WorkflowTemplateSeed } from './seed-type';

const seed: WorkflowTemplateSeed = {
  slug: 'webhook-relay',
  name: 'Webhook Relay',
  description: 'Receives any incoming webhook and forwards the payload on with an HTTP POST. Ships pointed at the built-in /playground/echo endpoint so it works out of the box — swap the Forward node\'s URL for your own. Good "hello world" template — no credentials required.',
  category: 'monitoring',
  tags: ['webhook', 'relay', 'http'],
  credentialSlots: [],
  definition: {
    trigger: { type: 'webhook' },
    nodes: [
      { id: 'n1', type: 'trigger.webhook', label: 'Incoming webhook', params: {} },
      {
        id: 'n2',
        type: 'http.request',
        label: 'Forward payload',
        params: {
          method: 'POST',
          url: 'http://localhost:7777/playground/echo',
          body: '{{ $trigger }}',
          headers: { 'content-type': 'application/json' },
        },
      },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
  },
};

export default seed;
