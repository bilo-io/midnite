import type { WorkflowTemplateSeed } from './seed-type';

// Gateway self-integration demo: a workflow that calls the gateway's *own* REST API
// over HTTP (the SSRF guard permits the gateway's configured origin), feeds the live
// task list to Claude for a short summary, and posts it as an in-app notification.
//
//   manual → http.request (GET /tasks) → ai.claude (summarise) → notify
//
// A real, useful "what's on my board right now?" starter. Runs against a local
// gateway with no credentials; behind a bearer token, add the token to the request.
const seed: WorkflowTemplateSeed = {
  slug: 'task-digest',
  name: 'Summarise my tasks',
  description:
    "Fetches the board's live task list from the gateway's own /tasks API, asks Claude for a short summary, and posts it as an in-app notification. A ready-made gateway self-integration you can run on demand.",
  category: 'ai',
  tags: ['tasks', 'ai', 'digest', 'gateway'],
  credentialSlots: [],
  definition: {
    trigger: { type: 'manual' },
    nodes: [
      { id: 'n1', type: 'trigger.manual', label: 'Run', position: { x: 80, y: 120 }, params: {} },
      {
        id: 'n2',
        type: 'http.request',
        label: 'Fetch tasks',
        position: { x: 320, y: 120 },
        params: { method: 'GET', url: 'http://localhost:7777/tasks' },
      },
      {
        id: 'n3',
        type: 'ai.claude',
        label: 'Summarise',
        position: { x: 560, y: 120 },
        params: {
          prompt:
            'Summarise the current board in 3 short bullet points — how many tasks, notable in-progress or blocked work, and anything that needs attention:\n\n{{ $node["Fetch tasks"].json.body }}',
          maxTokens: 512,
        },
      },
      {
        id: 'n4',
        type: 'midnite.notify',
        label: 'Notify',
        position: { x: 800, y: 120 },
        params: {
          kind: 'digest.generated',
          severity: 'info',
          title: 'Task board summary',
          body: '{{ $node["Summarise"].json.text }}',
          route: '/board',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', sourcePort: 'main', target: 'n2', targetPort: 'main' },
      { id: 'e2', source: 'n2', sourcePort: 'main', target: 'n3', targetPort: 'main' },
      { id: 'e3', source: 'n3', sourcePort: 'main', target: 'n4', targetPort: 'main' },
    ],
  },
};

export default seed;
