import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  getNodeTypeDefinition,
  type NodeRunLog,
  type RunStatus,
  type RunTriggerSource,
  type Workflow,
  type WorkflowGraph,
  type WorkflowRun,
} from '@midnite/shared';
import { WorkflowsRepository } from '../workflows.repository';
import { CyclicWorkflowError, predecessors, reachableFrom, topologicalOrder } from '../lib/graph';
import { ExecutorRegistry } from './executor-registry';

export interface RunOptions {
  triggerSource: RunTriggerSource;
  input?: unknown;
}

interface PreparedRun {
  runId: string;
  graph: WorkflowGraph;
  order: string[];
  triggerId: string;
}

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);
  private readonly active = new Map<string, AbortController>();

  constructor(
    @Inject(WorkflowsRepository) private readonly repo: WorkflowsRepository,
    @Inject(ExecutorRegistry) private readonly registry: ExecutorRegistry,
  ) {}

  /**
   * Static validation used at save time: every node type is known, every node's
   * params pass its schema, at most one trigger node, and the graph is acyclic.
   * Throws a descriptive Error the controller maps to 400.
   */
  validateGraph(graph: WorkflowGraph): void {
    const triggers = graph.nodes.filter(
      (n) => getNodeTypeDefinition(n.type)?.category === 'trigger',
    );
    if (triggers.length > 1) throw new Error('a workflow may have only one trigger node');

    for (const node of graph.nodes) {
      const def = getNodeTypeDefinition(node.type);
      if (!def) throw new Error(`unknown node type: ${node.type}`);
      const parsed = def.paramsSchema.safeParse(node.params ?? {});
      if (!parsed.success) {
        const detail = parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ');
        throw new Error(`invalid params for node "${node.label ?? node.id}" (${node.type}): ${detail}`);
      }
    }
    topologicalOrder(graph); // throws CyclicWorkflowError
  }

  /** Persist a run + its pending node-runs, then run it in the background. Returns immediately. */
  startRun(workflow: Workflow, opts: RunOptions): WorkflowRun {
    const prepared = this.createRun(workflow, opts);
    const controller = new AbortController();
    this.active.set(prepared.runId, controller);
    void this.executeRun(workflow, prepared, opts, controller.signal)
      .catch((err) =>
        this.logger.error(
          `workflow run ${prepared.runId} crashed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )
      .finally(() => this.active.delete(prepared.runId));
    return this.repo.getRun(workflow.id, prepared.runId)!;
  }

  /** Same as startRun but awaits completion — used by tests and synchronous callers. */
  async runToCompletion(workflow: Workflow, opts: RunOptions): Promise<WorkflowRun> {
    const prepared = this.createRun(workflow, opts);
    const controller = new AbortController();
    await this.executeRun(workflow, prepared, opts, controller.signal);
    return this.repo.getRun(workflow.id, prepared.runId)!;
  }

  cancel(runId: string): void {
    this.active.get(runId)?.abort();
  }

  private createRun(workflow: Workflow, opts: RunOptions): PreparedRun {
    const graph: WorkflowGraph = { nodes: workflow.nodes, edges: workflow.edges };
    const trigger = graph.nodes.find((n) => getNodeTypeDefinition(n.type)?.category === 'trigger');
    if (!trigger) throw new Error('workflow has no trigger node');

    let order: string[];
    try {
      order = topologicalOrder(graph);
    } catch (err) {
      if (err instanceof CyclicWorkflowError) throw err;
      throw err;
    }

    const runId = randomUUID();
    const startedAt = new Date().toISOString();
    this.repo.createRun({
      id: runId,
      workflowId: workflow.id,
      status: 'running',
      triggerSource: opts.triggerSource,
      input: opts.input === undefined ? null : JSON.stringify(opts.input),
      error: null,
      startedAt,
      finishedAt: null,
    });
    for (const nodeId of order) {
      const node = graph.nodes.find((n) => n.id === nodeId)!;
      this.repo.createNodeRun({
        id: randomUUID(),
        runId,
        nodeId,
        nodeType: node.type,
        status: 'pending',
        input: null,
        output: null,
        error: null,
        logs: null,
        startedAt: null,
        finishedAt: null,
      });
    }
    return { runId, graph, order, triggerId: trigger.id };
  }

  private async executeRun(
    workflow: Workflow,
    prepared: PreparedRun,
    opts: RunOptions,
    signal: AbortSignal,
  ): Promise<void> {
    const { runId, graph, order, triggerId } = prepared;
    const reachable = reachableFrom(graph, triggerId);
    const outputs = new Map<string, unknown>();
    let runStatus: RunStatus = 'succeeded';
    let runError: string | undefined;

    for (const nodeId of order) {
      const node = graph.nodes.find((n) => n.id === nodeId)!;
      const def = getNodeTypeDefinition(node.type)!;

      if (!reachable.has(nodeId)) {
        this.repo.updateNodeRun(runId, nodeId, {
          status: 'skipped',
          finishedAt: new Date().toISOString(),
        });
        continue;
      }
      if (signal.aborted) {
        runStatus = 'canceled';
        break;
      }

      // The trigger node emits the run's input payload; action/logic nodes receive the
      // merged output of their direct predecessors.
      let input: unknown;
      if (def.category === 'trigger') {
        input = opts.input ?? {};
      } else {
        const outs = predecessors(graph, nodeId).map((p) => outputs.get(p));
        input = outs.length <= 1 ? outs[0] : outs;
      }

      this.repo.updateNodeRun(runId, nodeId, {
        status: 'running',
        input: JSON.stringify(input ?? null),
        startedAt: new Date().toISOString(),
      });

      if (def.category === 'trigger') {
        outputs.set(nodeId, input);
        this.repo.updateNodeRun(runId, nodeId, {
          status: 'succeeded',
          output: JSON.stringify(input ?? null),
          finishedAt: new Date().toISOString(),
        });
        continue;
      }

      const executor = this.registry.get(node.type);
      const logs: NodeRunLog[] = [];
      if (!executor) {
        const message = `no executor registered for node type ${node.type}`;
        this.repo.updateNodeRun(runId, nodeId, {
          status: 'failed',
          error: message,
          finishedAt: new Date().toISOString(),
        });
        runStatus = 'failed';
        runError = message;
        break;
      }

      try {
        const output = await executor.execute({
          input,
          params: (node.params ?? {}) as Record<string, unknown>,
          signal,
          log: (level, message) => logs.push({ at: new Date().toISOString(), level, message }),
        });
        outputs.set(nodeId, output);
        this.repo.updateNodeRun(runId, nodeId, {
          status: 'succeeded',
          output: JSON.stringify(output ?? null),
          logs: JSON.stringify(logs),
          finishedAt: new Date().toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.repo.updateNodeRun(runId, nodeId, {
          status: 'failed',
          error: message,
          logs: JSON.stringify(logs),
          finishedAt: new Date().toISOString(),
        });
        runStatus = 'failed';
        runError = message;
        break;
      }
    }

    this.repo.skipPendingNodeRuns(runId);
    this.repo.finishRun(runId, {
      status: runStatus,
      error: runError ?? null,
      finishedAt: new Date().toISOString(),
    });
  }
}
