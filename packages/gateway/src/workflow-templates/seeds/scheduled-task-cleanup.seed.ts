import type { WorkflowTemplateSeed } from './seed-type';

const seed: WorkflowTemplateSeed = {
  slug: 'scheduled-task-cleanup',
  name: 'Scheduled Task Cleanup',
  description:
    'Runs weekly and moves tasks that have been stuck in "todo" for more than 30 days to "abandoned", keeping the board tidy automatically.',
  category: 'scheduling',
  tags: ['cleanup', 'tasks', 'maintenance', 'weekly'],
  credentialSlots: [],
  definition: {
    trigger: { type: 'schedule', cron: '0 3 * * 0' },
    nodes: [
      { id: 'n1', type: 'trigger.schedule', label: 'Weekly Sunday 03:00', params: {} },
      {
        id: 'n2',
        type: 'midnite.list-tasks',
        label: 'Stale todo tasks',
        params: {
          status: 'todo',
          createdBefore: '{{ $now | minus(30, "days") | iso }}',
        },
      },
      {
        id: 'n3',
        type: 'logic.if',
        label: 'Any stale tasks?',
        params: { condition: '{{ $n2.tasks.length > 0 }}' },
      },
      {
        id: 'n4',
        type: 'logic.for-each',
        label: 'For each stale task',
        params: { items: '{{ $n2.tasks }}' },
      },
      {
        id: 'n5',
        type: 'midnite.move-task',
        label: 'Abandon task',
        params: {
          taskId: '{{ $item.id }}',
          status: 'abandoned',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'true' },
      { id: 'e4', source: 'n4', target: 'n5' },
    ],
  },
};

export default seed;
