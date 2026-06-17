import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  evaluateBranchCondition,
  getNodeTypeDefinition,
  type NodeRunLog,
  type RunStatus,
  type RunTriggerSource,
  type Workflow,
  type WorkflowGraph,
  type WorkflowRun,
} from '@midnite/shared';
import { WorkflowsRepository } from '../workflows.repository';
import { WorkflowEventBus } from '../workflow-event-bus';
import { CyclicWorkflowError, predecessors, topologicalOrder } from '../lib/graph';

const BRANCH_TYPE = 'logic.branch';
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
    @Inject(WorkflowEventBus) private readonly bus: WorkflowEventBus,
  ) {}

  private now(): string {
    return new Date().toISOString();
  }

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
    this.bus.emit({
      type: 'run.started',
      workflowId: workflow.id,
      runId,
      at: startedAt,
      triggerSource: opts.triggerSource,
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
    const outputs = new Map<string, unknown>();
    let runStatus: RunStatus = 'succeeded';
    let runError: string | undefined;

    // Dynamic, port-aware liveness. A node runs once it has at least one incoming edge
    // from an already-run node via an *open* output port. Branch nodes open only the port
    // their condition selects; every other node opens all of its ports. Topological order
    // guarantees a node's predecessors are processed (and have propagated) before it, so
    // `live` membership is final by the time we reach each node.
    const live = new Set<string>([triggerId]);
    const propagate = (sourceId: string, openPorts: Set<string>): void => {
      for (const e of graph.edges) {
        if (e.source === sourceId && openPorts.has(e.sourcePort)) live.add(e.target);
      }
    };
    const allPorts = (nodeType: string): Set<string> =>
      new Set((getNodeTypeDefinition(nodeType)?.outputs ?? []).map((p) => p.name));

    for (const nodeId of order) {
      const node = graph.nodes.find((n) => n.id === nodeId)!;
      const def = getNodeTypeDefinition(node.type)!;

      if (!live.has(nodeId)) {
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
      this.bus.emit({
        type: 'node.started',
        workflowId: workflow.id,
        runId,
        at: this.now(),
        nodeId,
        nodeType: node.type,
      });

      if (def.category === 'trigger') {
        outputs.set(nodeId, input);
        this.repo.updateNodeRun(runId, nodeId, {
          status: 'succeeded',
          output: JSON.stringify(input ?? null),
          finishedAt: new Date().toISOString(),
        });
        this.emitNodeSucceeded(workflow.id, runId, nodeId, input);
        propagate(nodeId, allPorts(node.type));
        continue;
      }

      // Branch: evaluate the condition, pass the input through unchanged, and open only
      // the matching port so the other path's downstream nodes are skipped.
      if (node.type === BRANCH_TYPE) {
        const taken = evaluateBranchCondition(input, (node.params ?? {}) as Record<string, unknown>)
          ? 'true'
          : 'false';
        const logs: NodeRunLog[] = [
          {
            at: new Date().toISOString(),
            level: 'info',
            message: `condition ${taken === 'true' ? 'met' : 'not met'} → taking "${taken}" path`,
          },
        ];
        outputs.set(nodeId, input);
        this.repo.updateNodeRun(runId, nodeId, {
          status: 'succeeded',
          output: JSON.stringify(input ?? null),
          logs: JSON.stringify(logs),
          finishedAt: new Date().toISOString(),
        });
        this.emitNodeSucceeded(workflow.id, runId, nodeId, input);
        propagate(nodeId, new Set([taken]));
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
        this.emitNodeFailed(workflow.id, runId, nodeId, message);
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
        this.emitNodeSucceeded(workflow.id, runId, nodeId, output);
        propagate(nodeId, allPorts(node.type));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.repo.updateNodeRun(runId, nodeId, {
          status: 'failed',
          error: message,
          logs: JSON.stringify(logs),
          finishedAt: new Date().toISOString(),
        });
        this.emitNodeFailed(workflow.id, runId, nodeId, message);
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

    // Emit terminal run event *after* the DB write so a client reconciling via
    // REST sees consistent state.
    if (runStatus === 'failed') {
      this.bus.emit({
        type: 'run.failed',
        workflowId: workflow.id,
        runId,
        at: this.now(),
        error: runError ?? 'workflow run failed',
      });
    } else {
      const run = this.repo.getRun(workflow.id, runId);
      if (run) {
        this.bus.emit({ type: 'run.finished', workflowId: workflow.id, runId, at: this.now(), run });
      }
    }
  }

  private emitNodeSucceeded(
    workflowId: string,
    runId: string,
    nodeId: string,
    output: unknown,
  ): void {
    this.bus.emit({
      type: 'node.succeeded',
      workflowId,
      runId,
      at: this.now(),
      nodeId,
      output,
    });
  }

  private emitNodeFailed(workflowId: string, runId: string, nodeId: string, error: string): void {
    this.bus.emit({ type: 'node.failed', workflowId, runId, at: this.now(), nodeId, error });
  }
}
