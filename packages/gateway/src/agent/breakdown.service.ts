import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  BreakdownSchema,
  phaseItemAnchor,
  type Breakdown,
  type BreakdownPreviewResponse,
} from '@midnite/shared';

import { LlmService } from './llm/llm.service';
import {
  BREAKDOWN_SYSTEM_PROMPT,
  PHASE_DOC_PARSE_SYSTEM_PROMPT,
  STANDALONE_BREAKDOWN_SYSTEM_PROMPT,
} from '../projects/projects.prompts';

/** Matches a GitHub-style checkbox line; captures the trailing text. */
const CHECKBOX_RE = /^\s*[-*]\s*\[[ xX]\]\s+(.+?)\s*$/;

// JSON Schema for the `record_breakdown` tool the model calls to return its
// structured output. Mirrors `BreakdownSchema` so both sides stay in sync.
const RECORD_BREAKDOWN_SCHEMA = {
  type: 'object' as const,
  properties: {
    tasks: {
      type: 'array',
      description: 'Ordered list of tasks (dependencies first where applicable).',
      items: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Unique kebab-case slug for this task — used by dependsOn.',
          },
          title: {
            type: 'string',
            description: 'Short imperative task title ("Add user auth", "Build REST endpoint").',
          },
          kind: {
            type: 'string',
            enum: ['feature', 'fix', 'docs', 'chore', 'test', 'refactor', 'research'],
            description: 'Task kind.',
          },
          priority: {
            type: 'number',
            enum: [0, 1, 2, 3],
            description: '0=Low, 1=Normal, 2=High, 3=Urgent. Default 1.',
          },
          dependsOn: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Refs of tasks that must complete before this one. Only clear sequential blockers — leave independent tasks parallel.',
          },
        },
        required: ['ref', 'title', 'dependsOn'],
      },
    },
  },
  required: ['tasks'],
};

// Phase-doc variant of the record schema: same shape plus an optional `anchor`
// the model fills with the source checkbox text so seeded tasks can sync back.
const RECORD_PHASE_DOC_SCHEMA = {
  ...RECORD_BREAKDOWN_SCHEMA,
  properties: {
    tasks: {
      ...RECORD_BREAKDOWN_SCHEMA.properties.tasks,
      items: {
        ...RECORD_BREAKDOWN_SCHEMA.properties.tasks.items,
        properties: {
          ...RECORD_BREAKDOWN_SCHEMA.properties.tasks.items.properties,
          anchor: {
            type: 'string',
            description:
              'For a task taken from a checkbox line, the exact line text (without the "- [ ]" marker). Omit for tasks implied from prose.',
          },
        },
      },
    },
  },
};

export interface BreakdownInput {
  /** Freeform goal text or project description. */
  goal: string;
  /** Optional extra context (project name, existing plan) included in the user message. */
  context?: string;
  /** Use the project-aware system prompt (includes sources context). */
  isProject?: boolean;
}

/**
 * Generates a structured `Breakdown` from a goal/project description via the
 * plan model. Fail-open: when LLM is disabled or errors, returns a fallback
 * breakdown containing a single task from the raw goal text so creation never
 * breaks.
 */
@Injectable()
export class BreakdownService {
  private readonly logger = new Logger(BreakdownService.name);

  constructor(@Inject(LlmService) private readonly llm: LlmService) {}

  async generate(input: BreakdownInput): Promise<BreakdownPreviewResponse> {
    if (!this.llm.enabled) {
      return { breakdown: fallback(input.goal), isFallback: true };
    }

    const userText = input.context
      ? `${input.context}\n\nGoal:\n${input.goal}`
      : input.goal;

    try {
      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getPlanModel(),
          maxTokens: 2048,
          system: input.isProject ? BREAKDOWN_SYSTEM_PROMPT : STANDALONE_BREAKDOWN_SYSTEM_PROMPT,
          schema: RECORD_BREAKDOWN_SCHEMA,
          schemaName: 'record_breakdown',
          schemaDescription:
            'Record the structured, dependency-aware task breakdown.',
          messages: [{ role: 'user', text: userText }],
        },
        'planner',
      );

      const parsed = BreakdownSchema.safeParse(data);
      if (!parsed.success) {
        this.logger.warn(
          `breakdown schema mismatch (${parsed.error.message}); falling back to flat task`,
        );
        return { breakdown: fallback(input.goal), isFallback: true };
      }

      const breakdown = pruneBreakdown(parsed.data);
      return { breakdown, isFallback: false };
    } catch (err) {
      this.logger.warn(
        `breakdown generation failed (${err instanceof Error ? err.message : 'unknown'}); falling back to flat task`,
      );
      return { breakdown: fallback(input.goal), isFallback: true };
    }
  }

  /**
   * Parse a midnite-style phase doc into a task breakdown (Phase 42 Theme D). Each
   * task carries a stable `anchor` so the seeder can tag it `phase-item:<anchor>`
   * and Theme E can tick the matching `.md` checkbox.
   *
   * Fails open: the deterministic checkbox parse is always computed and is the
   * authoritative anchor source; when the LLM is enabled it enriches kind/priority/
   * dependency edges, but anchors are always reconciled back to real doc lines so
   * sync-back never chases a paraphrased anchor.
   */
  async parseDoc(content: string): Promise<BreakdownPreviewResponse> {
    const items = extractCheckboxItems(content);
    const deterministic: Breakdown = {
      tasks: items.map((it) => ({ ref: it.anchor, title: it.title, anchor: it.anchor, dependsOn: [] })),
    };

    if (!this.llm.enabled || items.length === 0) {
      return { breakdown: pruneBreakdown(deterministic), isFallback: true };
    }

    try {
      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getPlanModel(),
          maxTokens: 2048,
          system: PHASE_DOC_PARSE_SYSTEM_PROMPT,
          schema: RECORD_PHASE_DOC_SCHEMA,
          schemaName: 'record_breakdown',
          schemaDescription: 'Record the structured task breakdown extracted from the phase doc.',
          messages: [{ role: 'user', text: content }],
        },
        'planner',
      );

      const parsed = BreakdownSchema.safeParse(data);
      if (!parsed.success) {
        this.logger.warn(
          `phase-doc parse schema mismatch (${parsed.error.message}); using deterministic parse`,
        );
        return { breakdown: pruneBreakdown(deterministic), isFallback: true };
      }
      const reconciled = reconcileAnchors(parsed.data, new Set(items.map((it) => it.anchor)));
      return { breakdown: pruneBreakdown(reconciled), isFallback: false };
    } catch (err) {
      this.logger.warn(
        `phase-doc parse failed (${err instanceof Error ? err.message : 'unknown'}); using deterministic parse`,
      );
      return { breakdown: pruneBreakdown(deterministic), isFallback: true };
    }
  }
}

/** Extract `- [ ]`/`- [x]` lines as `{ anchor, title }`, deduped by anchor (first wins). */
export function extractCheckboxItems(content: string): Array<{ anchor: string; title: string }> {
  const seen = new Set<string>();
  const items: Array<{ anchor: string; title: string }> = [];
  for (const line of content.split('\n')) {
    const match = CHECKBOX_RE.exec(line);
    if (!match) continue;
    const title = match[1]!.replace(/[*_`~]/g, '').trim();
    const anchor = phaseItemAnchor(line);
    if (!anchor || seen.has(anchor)) continue;
    seen.add(anchor);
    items.push({ anchor, title });
  }
  return items;
}

/**
 * Reconcile an LLM breakdown's anchors against the doc's real checkbox anchors:
 * keep an `anchor` only when it (or the slug of the model's `anchor`/`title`)
 * matches a real line — otherwise drop it so Theme E never tries to tick a line
 * that doesn't exist. Tasks implied from prose simply carry no anchor.
 */
function reconcileAnchors(breakdown: Breakdown, known: Set<string>): Breakdown {
  return {
    tasks: breakdown.tasks.map((t) => {
      const candidates = [t.anchor, t.anchor && phaseItemAnchor(t.anchor), phaseItemAnchor(t.title)];
      const anchor = candidates.find((c): c is string => !!c && known.has(c));
      return { ...t, anchor };
    }),
  };
}

/**
 * Sanitise the model's output:
 * 1. Deduplicate refs (first occurrence wins).
 * 2. Remove self-references from `dependsOn`.
 * 3. Remove `dependsOn` entries that reference unknown refs.
 * 4. Prune edges that would create a cycle (topological-sort-based check).
 */
export function pruneBreakdown(raw: Breakdown): Breakdown {
  const seen = new Set<string>();
  // Deduplicate refs; preserve order.
  const deduped = raw.tasks.filter((t) => {
    if (seen.has(t.ref)) return false;
    seen.add(t.ref);
    return true;
  });

  const knownRefs = new Set(deduped.map((t) => t.ref));

  // Build a mutable adjacency map (ref → set of deps) so we can detect cycles
  // incrementally as we add each edge.
  const deps = new Map<string, Set<string>>(deduped.map((t) => [t.ref, new Set()]));

  const wouldCycle = (from: string, to: string): boolean => {
    // DFS from `to` — if we can reach `from`, adding from→to closes a cycle.
    const visited = new Set<string>();
    const stack = [to];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node === from) return true;
      if (visited.has(node)) continue;
      visited.add(node);
      for (const dep of deps.get(node) ?? []) stack.push(dep);
    }
    return false;
  };

  const tasks = deduped.map((t) => {
    const cleanDeps: string[] = [];
    for (const dep of t.dependsOn) {
      if (dep === t.ref) continue; // self-reference
      if (!knownRefs.has(dep)) continue; // unknown ref
      if (wouldCycle(t.ref, dep)) continue; // would close a cycle
      cleanDeps.push(dep);
      deps.get(t.ref)!.add(dep);
    }
    return { ...t, dependsOn: cleanDeps };
  });

  return { tasks };
}

/** Single-task fallback when the LLM is unavailable. */
function fallback(goal: string): Breakdown {
  return {
    tasks: [
      {
        ref: 'task-1',
        title: goal.length > 80 ? goal.slice(0, 77) + '…' : goal,
        dependsOn: [],
      },
    ],
  };
}
