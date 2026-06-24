import type { WorkflowTemplateSeed } from './seed-type';

// Phase 37 Theme B: built-in AI code review template.
// Trigger: GitHub pull_request webhook (opened or synchronize events).
// Flow:  trigger.webhook → logic.if (filter action) → github.get-pr → github.get-diff
//        → ai.claude (structured review) → github.post-review (post comment back)
const seed: WorkflowTemplateSeed = {
  slug: 'ai-code-review',
  name: 'AI Code Review',
  description:
    'Automatically reviews GitHub pull requests with Claude. Trigger via a GitHub pull_request webhook — on every push to a PR, fetches the diff, sends it to Claude for a structured review, and posts the result back as a GitHub review comment.',
  category: 'github',
  tags: ['code-review', 'github', 'ai'],
  credentialSlots: [
    {
      key: 'github-token',
      type: 'github',
      description: 'GitHub Personal Access Token with pull_requests:write and contents:read scopes',
    },
  ],
  definition: {
    trigger: { type: 'webhook' },
    nodes: [
      {
        id: 'n1',
        type: 'trigger.webhook',
        label: 'GitHub PR webhook',
        params: {},
      },
      {
        id: 'n2',
        type: 'logic.if',
        label: 'Is opened or synchronize?',
        params: {
          condition:
            "{{ $trigger.action === 'opened' || $trigger.action === 'synchronize' }}",
        },
      },
      {
        id: 'n3',
        type: 'github.get-pr',
        label: 'Fetch PR metadata',
        params: {
          credentialId: 'slot:github-token',
          prUrl: '{{ $trigger.pull_request.html_url }}',
        },
      },
      {
        id: 'n4',
        type: 'github.get-diff',
        label: 'Fetch PR diff',
        params: {
          credentialId: 'slot:github-token',
          prUrl: '{{ $trigger.pull_request.html_url }}',
          maxTokens: 8000,
        },
      },
      {
        id: 'n5',
        type: 'ai.claude',
        label: 'Claude review',
        params: {
          model: 'claude-sonnet-4-6',
          system:
            'You are a senior software engineer performing a thorough but constructive code review. Be concise, specific, and actionable. Focus on correctness, security, and maintainability.',
          prompt: [
            'PR: {{ $n3.title }}',
            'Author: {{ $n3.author }}',
            'Base → Head: {{ $n3.baseBranch }} → {{ $n3.headBranch }}',
            'Changes: +{{ $n3.additions }} −{{ $n3.deletions }} across {{ $n3.changedFiles }} file(s)',
            '',
            'Description:',
            '{{ $n3.body }}',
            '',
            'Diff:',
            '{{ $n4.diff }}',
            '',
            'Review this PR. Start with a one-sentence verdict (LGTM / minor issues / needs changes).',
            'Then list specific findings with file/line references where applicable.',
            'End with an overall recommendation.',
          ].join('\n'),
          maxTokens: 1500,
        },
      },
      {
        id: 'n6',
        type: 'github.post-review',
        label: 'Post review comment',
        params: {
          credentialId: 'slot:github-token',
          prUrl: '{{ $trigger.pull_request.html_url }}',
          body: '{{ $n5.text }}',
          event: 'COMMENT',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'true' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6' },
    ],
  },
};

export default seed;
