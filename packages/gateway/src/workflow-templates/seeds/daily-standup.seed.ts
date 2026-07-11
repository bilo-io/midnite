import type { WorkflowTemplateSeed } from './seed-type';

// A `[manual] → [task.create]` starter: press Run to open a standup task with a
// ready-made prompt. Edit it in the full builder, or wire a webhook/task-event
// trigger onto it if you want it to fire automatically.
const seed: WorkflowTemplateSeed = {
  slug: 'daily-standup',
  name: 'Open standup task',
  description:
    'Opens a standup task with a ready-made prompt when you press Run — a starting point you can extend in the full builder.',
  category: 'notifications',
  tags: ['standup', 'tasks'],
  credentialSlots: [],
  definition: {
    trigger: { type: 'manual' },
    nodes: [
      { id: 'n1', type: 'trigger.manual', label: 'Run', position: { x: 80, y: 120 }, params: {} },
      {
        id: 'n2',
        type: 'task.create',
        label: 'Open standup task',
        position: { x: 320, y: 120 },
        params: {
          prompt:
            'Daily standup — post yesterday’s progress, today’s plan, and any blockers.',
          priority: 1,
        },
      },
    ],
    edges: [{ id: 'e1', source: 'n1', sourcePort: 'main', target: 'n2', targetPort: 'main' }],
  },
};

export default seed;
