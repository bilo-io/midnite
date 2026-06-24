import type { WorkflowTemplateSeed } from './seed-type';

const seed: WorkflowTemplateSeed = {
  slug: 'github-pr-ready-check',
  name: 'GitHub PR Ready Check',
  description:
    'Polls open pull requests on a schedule and posts a Slack notification when all CI checks pass and the PR is ready to merge.',
  category: 'github',
  tags: ['github', 'pull-request', 'ci', 'slack'],
  credentialSlots: [
    { key: 'github-token', type: 'github', description: 'GitHub PAT with repo read scope' },
    { key: 'slack-workspace', type: 'slack', description: 'Slack bot token with chat:write scope' },
  ],
  definition: {
    trigger: { type: 'schedule', cron: '*/15 * * * *' },
    nodes: [
      { id: 'n1', type: 'trigger.schedule', label: 'Every 15 min', params: {} },
      {
        id: 'n2',
        type: 'github.list-prs',
        label: 'List open PRs',
        params: {
          credentialId: 'slot:github-token',
          owner: '{{ $config.githubOwner }}',
          repo: '{{ $config.githubRepo }}',
          state: 'open',
        },
      },
      {
        id: 'n3',
        type: 'logic.for-each',
        label: 'For each PR',
        params: { items: '{{ $n2.prs }}' },
      },
      {
        id: 'n4',
        type: 'github.get-pr-checks',
        label: 'Get checks',
        params: {
          credentialId: 'slot:github-token',
          prUrl: '{{ $item.html_url }}',
        },
      },
      {
        id: 'n5',
        type: 'logic.if',
        label: 'All checks passed?',
        params: {
          condition:
            "{{ $n4.conclusion === 'success' && $item.draft === false }}",
        },
      },
      {
        id: 'n6',
        type: 'slack.message',
        label: 'Notify ready to merge',
        params: {
          credentialId: 'slot:slack-workspace',
          channel: '#engineering',
          text: '✅ PR *{{ $item.title }}* is ready to merge: {{ $item.html_url }}',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6', sourceHandle: 'true' },
    ],
  },
};

export default seed;
