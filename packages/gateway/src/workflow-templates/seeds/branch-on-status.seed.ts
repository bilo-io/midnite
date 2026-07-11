import type { WorkflowTemplateSeed } from './seed-type';

// A self-contained demo of conditional routing, runnable with zero setup. It calls
// the built-in `/playground/echo` endpoint, then a `logic.branch` splits on the HTTP
// status: 200 → an "ok" in-app notification, anything else → a "warn" one. Press Run
// and watch exactly one of the two notify nodes light up in the run panel.
//
//   manual → http.request (GET /playground/echo) → logic.branch (status == 200)
//                                                     ├─true──▶ notify (ok)
//                                                     └─false─▶ notify (failed)
const seed: WorkflowTemplateSeed = {
  slug: 'branch-on-status',
  name: 'Branch on HTTP status',
  description:
    'Calls the built-in demo endpoint, then branches on the HTTP status code — notifying one way on 200 and another on anything else. A zero-setup showcase of conditional (true/false) routing.',
  category: 'monitoring',
  tags: ['branch', 'http', 'demo', 'monitoring'],
  credentialSlots: [],
  definition: {
    trigger: { type: 'manual' },
    nodes: [
      { id: 'n1', type: 'trigger.manual', label: 'Run', position: { x: 80, y: 160 }, params: {} },
      {
        id: 'n2',
        type: 'http.request',
        label: 'Ping playground',
        position: { x: 320, y: 160 },
        params: { method: 'GET', url: 'http://localhost:7777/playground/echo?ping=1' },
      },
      {
        id: 'n3',
        type: 'logic.branch',
        label: 'Status is 200?',
        position: { x: 560, y: 160 },
        params: { left: 'status', operator: 'equals', right: '200' },
      },
      {
        id: 'n4',
        type: 'midnite.notify',
        label: 'Notify OK',
        position: { x: 820, y: 80 },
        params: {
          kind: 'digest.generated',
          severity: 'info',
          title: 'Playground is healthy',
          body: 'The echo endpoint returned status {{ $node["Ping playground"].json.status }}.',
        },
      },
      {
        id: 'n5',
        type: 'midnite.notify',
        label: 'Notify failure',
        position: { x: 820, y: 240 },
        params: {
          kind: 'digest.generated',
          severity: 'warn',
          title: 'Playground check failed',
          body: 'The echo endpoint returned status {{ $node["Ping playground"].json.status }}.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', sourcePort: 'main', target: 'n2', targetPort: 'main' },
      { id: 'e2', source: 'n2', sourcePort: 'main', target: 'n3', targetPort: 'main' },
      { id: 'e3', source: 'n3', sourcePort: 'true', target: 'n4', targetPort: 'main' },
      { id: 'e4', source: 'n3', sourcePort: 'false', target: 'n5', targetPort: 'main' },
    ],
  },
};

export default seed;
