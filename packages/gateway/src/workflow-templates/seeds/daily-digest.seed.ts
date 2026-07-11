import type { WorkflowTemplateSeed } from './seed-type';

/**
 * Phase 62 Theme E — the morning "what did the fleet do?", assembled by the product
 * itself. Upgrades the old freeform list-tasks → ai.claude draft into the real,
 * structured digest pipeline built in Theme C:
 *
 *   schedule (weekdays 08:00) → list-completed-tasks (24h) → build-digest
 *                                                              ├─▶ slack.message (rich blocks)
 *                                                              └─▶ midnite.notify (in-app)
 *
 * Delivery fans out in parallel and is failure-isolated: the in-app notification is
 * guaranteed, while Slack is best-effort — the Slack credential slot is optional, and
 * when it's left unbound the slack.message node skips cleanly (it never fails the run),
 * so the template installs + one-click-enables with in-app-only delivery.
 */
const seed: WorkflowTemplateSeed = {
  slug: 'daily-digest',
  name: 'Daily Fleet Digest',
  description:
    'Every weekday morning, rolls the last 24h of completed & abandoned tasks into a structured fleet digest — shipped / failed / needs-attention with per-repo sections, spend & cycle-time, and an LLM headline — delivered in-app and (when a Slack credential is bound) to a Slack channel. Runs at 08:00 UTC, Mon–Fri.',
  category: 'scheduling',
  tags: ['slack', 'digest', 'daily', 'tasks', 'fleet'],
  credentialSlots: [
    {
      key: 'slack-workspace',
      type: 'slack',
      description:
        'Optional — a Slack bot token (chat:write) to post the digest to a channel. Leave unbound to deliver in-app only.',
    },
  ],
  definition: {
    trigger: { type: 'schedule', cron: '0 8 * * 1-5' },
    nodes: [
      { id: 'n1', type: 'trigger.schedule', label: 'Weekdays 08:00', params: {} },
      {
        id: 'n2',
        type: 'midnite.list-completed-tasks',
        label: 'Completed (24h)',
        params: { sinceHours: 24 },
      },
      {
        id: 'n3',
        type: 'midnite.build-digest',
        label: 'Build digest',
        params: { sinceHours: 24 },
      },
      {
        id: 'n4',
        type: 'slack.message',
        label: 'Post to Slack',
        params: {
          credentialId: 'slot:slack-workspace',
          channel: '#daily-standup',
          text: ':sunrise: *Daily Fleet Digest*\n\n{{ $json.headline }}',
          blocks: '{{ $json.blocks }}',
        },
      },
      {
        id: 'n5',
        type: 'midnite.notify',
        label: 'Notify in-app',
        params: {
          kind: 'digest.generated',
          severity: 'info',
          title: '{{ $json.headline }}',
          body: '{{ $json.markdown }}',
          entityId: '{{ $json.digestId }}',
          route: '/digests',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n3', target: 'n5' },
    ],
  },
};

export default seed;
