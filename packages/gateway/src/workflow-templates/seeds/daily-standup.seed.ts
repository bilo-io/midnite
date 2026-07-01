import type { WorkflowTemplateSeed } from './seed-type';

// Phase 45 D — the headline "recurring task" starter. A `[schedule] → [task.create]`
// workflow that opens a standup task every weekday at 09:00. The `recurring-task`
// tag marks it as a task-creating schedule so the Schedules facade's "New from
// preset" menu can surface it (and skip cleanup-style scheduled workflows that
// never create a task and so wouldn't show up in the Schedules list).
const seed: WorkflowTemplateSeed = {
  slug: 'daily-standup',
  name: 'Daily standup',
  description:
    'Opens a standup task every weekday at 09:00 — a ready-made recurring task you can edit in the Schedules view or the full builder.',
  category: 'scheduling',
  tags: ['standup', 'recurring-task', 'daily', 'tasks'],
  credentialSlots: [],
  definition: {
    trigger: { type: 'schedule', cron: '0 9 * * 1-5', timezone: 'UTC' },
    nodes: [
      { id: 'n1', type: 'trigger.schedule', label: 'Weekdays 09:00', position: { x: 80, y: 120 }, params: {} },
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
