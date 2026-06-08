import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  type CreateWorkflowRequest,
  type MidniteConfig,
  type RunTriggerSource,
  type Trigger,
  type UpdateWorkflowRequest,
  type WebhookInfoResponse,
  type Workflow,
  type WorkflowGraph,
  type WorkflowRun,
  type WorkflowSummary,
} from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { hashToken, tokenMatches } from '../lib/token-hash';
import { WorkflowsRepository } from './workflows.repository';
import { WorkflowEngine } from './engine/workflow-engine.service';

const DEFAULT_TRIGGER: Trigger = { type: 'manual' };

function triggerNodeType(type: Trigger['type']): string {
  return `trigger.${type}`;
}

@Injectable()
export class WorkflowsService {
  constructor(
    @Inject(WorkflowsRepository) private readonly repo: WorkflowsRepository,
    @Inject(WorkflowEngine) private readonly engine: WorkflowEngine,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {}

  // --- reads ---

  listSummaries(): WorkflowSummary[] {
    return this.repo.listWorkflowRows().map((row) => {
      const workflow = this.repo.hydrateWorkflow(row);
      const latest = this.repo.latestRunRow(row.id);
      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        enabled: workflow.enabled,
        triggerType: workflow.trigger.type,
        cron: workflow.trigger.type === 'schedule' ? workflow.trigger.cron : undefined,
        nodeCount: workflow.nodes.length,
        lastRunAt: latest?.startedAt,
        lastRunStatus: latest?.status as WorkflowSummary['lastRunStatus'] | undefined,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      };
    });
  }

  getWorkflow(id: string): Workflow {
    const row = this.repo.getWorkflowRow(id);
    if (!row) throw new NotFoundException(`workflow ${id} not found`);
    return this.repo.hydrateWorkflow(row);
  }

  listRuns(workflowId: string): WorkflowRun[] {
    this.getWorkflow(workflowId); // 404 if missing
    return this.repo.listRunRows(workflowId).map((r) => this.repo.hydrateRun(r, false));
  }

  getRun(workflowId: string, runId: string): WorkflowRun {
    this.getWorkflow(workflowId);
    const run = this.repo.getRun(workflowId, runId);
    if (!run) throw new NotFoundException(`run ${runId} not found`);
    return run;
  }

  // --- writes ---

  create(req: CreateWorkflowRequest): Workflow {
    const id = randomUUID();
    const now = new Date().toISOString();
    const trigger = req.trigger ?? DEFAULT_TRIGGER;
    // Seed a single trigger node so the canvas opens with the entry point in place.
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: randomUUID(),
          type: triggerNodeType(trigger.type),
          label: 'Trigger',
          position: { x: 160, y: 160 },
          params: {},
        },
      ],
      edges: [],
    };

    const row = this.repo.insertWorkflow({
      id,
      name: req.name,
      description: req.description ?? null,
      enabled: 0,
      triggerType: trigger.type,
      trigger: JSON.stringify(trigger),
      graph: JSON.stringify(graph),
      webhookSecretHash: null,
      lastFiredAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return this.repo.hydrateWorkflow(row);
  }

  update(id: string, req: UpdateWorkflowRequest): Workflow {
    const current = this.getWorkflow(id);
    const trigger = req.trigger ?? current.trigger;
    const nodes = req.nodes ?? current.nodes;
    const edges = req.edges ?? current.edges;

    // `workflow.trigger` is canonical — force the single trigger node's type to match it.
    const graph = this.syncTriggerNode({ nodes, edges }, trigger);

    try {
      this.engine.validateGraph(graph);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'invalid workflow graph');
    }

    const patch: Record<string, unknown> = {
      trigger: JSON.stringify(trigger),
      triggerType: trigger.type,
      graph: JSON.stringify(graph),
      updatedAt: new Date().toISOString(),
    };
    if (req.name !== undefined) patch.name = req.name;
    if (req.description !== undefined) patch.description = req.description;
    if (req.enabled !== undefined) patch.enabled = req.enabled ? 1 : 0;

    const row = this.repo.updateWorkflowRow(id, patch);
    if (!row) throw new NotFoundException(`workflow ${id} not found`);
    return this.repo.hydrateWorkflow(row);
  }

  delete(id: string): void {
    this.getWorkflow(id); // 404 if missing
    this.repo.deleteWorkflow(id);
  }

  run(id: string, input: unknown, source: RunTriggerSource = 'manual'): WorkflowRun {
    const workflow = this.getWorkflow(id);
    try {
      return this.engine.startRun(workflow, { triggerSource: source, input });
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'cannot run workflow');
    }
  }

  // --- webhooks ---

  rotateWebhookSecret(id: string): WebhookInfoResponse {
    const workflow = this.getWorkflow(id);
    if (workflow.trigger.type !== 'webhook') {
      throw new BadRequestException('workflow trigger is not a webhook');
    }
    const token = randomBytes(24).toString('base64url');
    this.repo.updateWorkflowRow(id, {
      webhookSecretHash: hashToken(token),
      trigger: JSON.stringify({ ...workflow.trigger, hasSecret: true }),
      updatedAt: new Date().toISOString(),
    });
    return { url: this.webhookUrl(id, token), token };
  }

  handleWebhook(id: string, token: string, body: unknown): WorkflowRun {
    const row = this.repo.getWorkflowRow(id);
    if (!row) throw new NotFoundException(`workflow ${id} not found`);
    const workflow = this.repo.hydrateWorkflow(row);
    if (workflow.trigger.type !== 'webhook') {
      throw new BadRequestException('workflow trigger is not a webhook');
    }
    if (!row.webhookSecretHash || !tokenMatches(token, row.webhookSecretHash)) {
      throw new NotFoundException('invalid webhook token');
    }
    if (!workflow.enabled) {
      throw new BadRequestException('workflow is disabled');
    }
    return this.engine.startRun(workflow, { triggerSource: 'webhook', input: body });
  }

  // --- helpers ---

  private webhookUrl(id: string, token: string): string {
    const base = this.config.workflows.webhookBaseUrl.replace(/\/$/, '');
    return `${base}/hooks/workflows/${id}/${token}`;
  }

  private syncTriggerNode(graph: WorkflowGraph, trigger: Trigger): WorkflowGraph {
    const wantType = triggerNodeType(trigger.type);
    const triggerNodes = graph.nodes.filter((n) => n.type.startsWith('trigger.'));
    if (triggerNodes.length === 0) {
      return {
        nodes: [
          {
            id: randomUUID(),
            type: wantType,
            label: 'Trigger',
            position: { x: 160, y: 160 },
            params: {},
          },
          ...graph.nodes,
        ],
        edges: graph.edges,
      };
    }
    return {
      nodes: graph.nodes.map((n) =>
        n.type.startsWith('trigger.') ? { ...n, type: wantType } : n,
      ),
      edges: graph.edges,
    };
  }
}
