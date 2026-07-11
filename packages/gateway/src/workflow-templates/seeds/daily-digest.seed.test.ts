import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type Workflow, type WorkflowGraph, type WorkflowNode } from '@midnite/shared';

import * as schema from '../../db/schema';
import { WorkflowsRepository } from '../../workflows/workflows.repository';
import { WorkflowEventBus } from '../../workflows/workflow-event-bus';
import { ExecutorRegistry } from '../../workflows/engine/executor-registry';
import { WorkflowEngine } from '../../workflows/engine/workflow-engine.service';
import { SlackMessageExecutor } from '../../workflows/engine/executors/slack-message.executor';
import type { NodeExecutor } from '../../workflows/engine/node-executor';
import type { WorkflowCredentialsService } from '../../workflows/credentials/workflow-credentials.service';
import seed from './daily-digest.seed';

// Phase 62 Theme E — the upgraded daily-digest template. Two layers: (1) the seed's
// static shape (schedule → list-completed → build-digest → {slack, notify}), and
// (2) a real engine run over the definition with fake node executors, asserting the
// digest is built, the in-app notify fires, and an *unbound* Slack slot skips cleanly
// (never failing the run) — the parallel, failure-isolated, in-app-guaranteed delivery.

const NOW = '2026-07-11T00:00:00.000Z';

interface SeedDefinition {
  trigger: { type: string };
  nodes: { id: string; type: string; label?: string; params?: Record<string, unknown> }[];
  edges: { id: string; source: string; target: string }[];
}

const definition = seed.definition as unknown as SeedDefinition;

/** Materialise the stored seed definition into a runnable Workflow (add canvas
 *  positions + explicit ports the stored form omits). */
function toWorkflow(): Workflow {
  const nodes: WorkflowNode[] = definition.nodes.map((n, i) => ({
    id: n.id,
    type: n.type,
    label: n.label,
    position: { x: i * 160, y: 0 },
    params: n.params ?? {},
  }));
  const edges = definition.edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourcePort: 'main',
    target: e.target,
    targetPort: 'main',
  }));
  return {
    id: 'daily-digest-wf',
    name: seed.name,
    enabled: false,
    trigger: definition.trigger as Workflow['trigger'],
    nodes,
    edges,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  return db;
}

describe('daily-digest seed — shape', () => {
  it('is a run-on-demand notifications digest', () => {
    expect(seed.slug).toBe('daily-digest');
    expect(seed.category).toBe('notifications');
    expect(seed.tags).toContain('digest');
  });

  it('upgrades to the structured Theme C pipeline (no freeform ai.claude draft)', () => {
    expect(definition.trigger).toEqual({ type: 'manual' });
    expect(definition.nodes.map((n) => n.type)).toEqual([
      'trigger.manual',
      'midnite.list-completed-tasks',
      'midnite.build-digest',
      'slack.message',
      'midnite.notify',
    ]);
    // build-digest fans out to BOTH delivery nodes in parallel.
    const fromBuild = definition.edges
      .filter((e) => e.source === 'n3')
      .map((e) => e.target)
      .sort();
    expect(fromBuild).toEqual(['n4', 'n5']);
    expect(definition.nodes.some((n) => n.type === 'ai.claude')).toBe(false);
    expect(definition.nodes.some((n) => n.type === 'midnite.list-tasks')).toBe(false);
  });

  it('keeps Slack as an optional, best-effort credential slot', () => {
    const slot = seed.credentialSlots?.[0];
    expect(slot?.type).toBe('slack');
    expect(slot?.description).toMatch(/optional/i);
  });

  it('passes engine graph validation — the blocks expression survives raw param validation', () => {
    const repo = new WorkflowsRepository(makeDb());
    const engine = new WorkflowEngine(
      repo,
      new ExecutorRegistry([]),
      new WorkflowEventBus(),
      parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} }),
    );
    const graph: WorkflowGraph = { nodes: toWorkflow().nodes, edges: toWorkflow().edges };
    expect(() => engine.validateGraph(graph)).not.toThrow();
  });
});

describe('daily-digest seed — pipeline run', () => {
  let repo: WorkflowsRepository;
  let engine: WorkflowEngine;
  const buildInputs: unknown[] = [];
  const notifyParams: unknown[] = [];
  const resolveSpy = vi.fn();

  beforeEach(() => {
    buildInputs.length = 0;
    notifyParams.length = 0;
    resolveSpy.mockReset();

    const listCompleted: NodeExecutor = {
      typeId: 'midnite.list-completed-tasks',
      async execute() {
        return { from: NOW, to: NOW, count: 2, tasks: [{ id: 't1' }, { id: 't2' }] };
      },
    };
    const buildDigest: NodeExecutor = {
      typeId: 'midnite.build-digest',
      async execute(ctx) {
        buildInputs.push(ctx.input);
        return {
          digestId: 'dig-1',
          headline: 'Shipped 2, 0 failed',
          markdown: '# Digest\n- t1\n- t2',
          blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '*Digest*' } }],
        };
      },
    };
    const notify: NodeExecutor = {
      typeId: 'midnite.notify',
      async execute(ctx) {
        notifyParams.push(ctx.params);
        return { notified: true };
      },
    };
    // Real Slack executor with a credentials stub that MUST NOT be reached: the
    // unbound `slot:` sentinel short-circuits before resolution.
    const slack = new SlackMessageExecutor({
      resolve: resolveSpy,
    } as unknown as WorkflowCredentialsService);

    repo = new WorkflowsRepository(makeDb());
    engine = new WorkflowEngine(
      repo,
      new ExecutorRegistry([listCompleted, buildDigest, slack, notify]),
      new WorkflowEventBus(),
      parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} }),
    );
  });

  it('builds a digest, notifies in-app, and skips the unbound Slack step without failing', async () => {
    const run = await engine.runToCompletion(toWorkflow(), { triggerSource: 'manual', input: {} });

    expect(run.status).toBe('succeeded');

    // build-digest consumed the upstream completed-task list.
    expect(buildInputs).toHaveLength(1);
    expect((buildInputs[0] as { tasks: unknown[] }).tasks).toHaveLength(2);

    // In-app notify received the digest's headline/markdown/id + the /digests route.
    expect(notifyParams[0]).toMatchObject({
      kind: 'digest.generated',
      title: 'Shipped 2, 0 failed',
      body: '# Digest\n- t1\n- t2',
      entityId: 'dig-1',
      route: '/digests',
    });

    // Slack skipped cleanly on the unbound slot — credentials never resolved.
    const slackRun = run.nodeRuns.find((r) => r.nodeId === 'n4')!;
    expect(slackRun.status).toBe('succeeded');
    expect(slackRun.output).toMatchObject({ skipped: true, reason: 'unbound-credential-slot' });
    expect(resolveSpy).not.toHaveBeenCalled();
  });
});
