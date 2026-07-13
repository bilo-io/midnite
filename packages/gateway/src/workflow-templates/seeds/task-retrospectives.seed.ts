import type { WorkflowTemplateSeed } from './seed-type';

/**
 * Phase 62 Theme D — the **Task Retrospectives** pipeline.
 *
 * `[trigger.task-event] → [generate-retro] → [branch: notable?] →(true) [notify]`
 *
 * When a task reaches `done` or `abandoned`, the deterministic retro skeleton
 * (Theme A) already exists; this pipeline layers the AI narrative on
 * (`generate-retro`) and, **only when the retro is notable** (abandoned /
 * retries-exhausted / gate-failed / failed checks — `isRetroNotable`), posts a
 * `retro.notable` in-app notification so failures surface with their story
 * attached, not just a status flip. A routine `done` stays quiet (the `false`
 * branch has no target).
 *
 * ── Cost ──────────────────────────────────────────────────────────────────
 * One small plan-model call per terminal task (`generate-retro`, usage tag
 * `'retro'`, ≤700 output tokens). No call is made when AI is disabled or no
 * transcript exists — the node fail-softs to the deterministic skeleton, and the
 * `notable` branch still works (it's computed from the skeleton, not the LLM).
 *
 * ── Budget caps ───────────────────────────────────────────────────────────
 * The call runs through the same `LlmService` as every other agent/workflow
 * completion, so the Phase 50 spend caps and Phase 61 cost attribution apply: if
 * a global/team budget is exhausted the completion is refused and `generate-retro`
 * degrades to the skeleton (narrative null) — the pipeline never bypasses the cap.
 *
 * ── Adding a Slack step ───────────────────────────────────────────────────
 * To also post notable retros to Slack, add a `slack.message` node wired off the
 * branch's `true` handle (alongside — or instead of — `notify`), give the template
 * a `slack` credential slot, and reference the task in the text, e.g.
 * `⚠️ Notable retro: {{ $node["Task done / abandoned"].json.task.title }} ({{ $json.outcome }})`.
 *
 * Expression note: node params resolve against `$json` (this node's input — here
 * the branch's pass-through of the retro output, so `$json.outcome`/`$json.notable`)
 * and `$node["<label>"].json` (any upstream node's output by label — the trigger's
 * task lives at `$node["Task done / abandoned"].json.task`). There is no `$trigger`
 * root.
 */
const seed: WorkflowTemplateSeed = {
  slug: 'task-retrospectives',
  name: 'Task Retrospectives',
  description:
    'When a task finishes or is abandoned, generate an AI retrospective and — only when the outcome is notable (abandoned, retries exhausted, or a failed gate) — post an in-app notification so failures surface with their story. Costs one small AI call per terminal task; add a Slack step to also post to a channel.',
  category: 'notifications',
  tags: ['retro', 'task', 'notify', 'reporting'],
  definition: {
    trigger: { type: 'task-event', events: ['task.done', 'task.abandoned'] },
    nodes: [
      { id: 'n1', type: 'trigger.task-event', label: 'Task done / abandoned', params: {} },
      {
        id: 'n2',
        type: 'midnite.generate-retro',
        label: 'Generate retro',
        // Blank taskId → the executor reads the task from the trigger input.
        params: { taskId: '' },
      },
      {
        id: 'n3',
        type: 'logic.branch',
        label: 'Notable?',
        params: { left: 'notable', operator: 'isTruthy' },
      },
      {
        id: 'n4',
        type: 'midnite.notify',
        label: 'Notify (notable)',
        params: {
          kind: 'retro.notable',
          severity: 'warn',
          title: 'Notable retro: {{ $node["Task done / abandoned"].json.task.title }}',
          body: 'Task "{{ $node["Task done / abandoned"].json.task.title }}" ended {{ $json.outcome }} — open its retrospective for the full story.',
          entityId: '{{ $node["Task done / abandoned"].json.task.id }}',
          route: '/tasks',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4', sourceHandle: 'true' },
    ],
  },
};

export default seed;
