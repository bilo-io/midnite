import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CreateFromWorkflowRequest,
  CreateTemplateRequest,
  InstallTemplateRequest,
  TemplateSlotsResponse,
  UpdateTemplateRequest,
  Workflow,
  WorkflowTemplate,
  WorkflowTemplateSummary,
} from '@midnite/shared';
import { WorkflowsService } from '../workflows/workflows.service';
import { WorkflowCredentialsService } from '../workflows/credentials/workflow-credentials.service';
import { WorkflowTemplatesRepository, type TemplateListFilter } from './workflow-templates.repository';
import type { WorkflowTemplateSeed } from './seeds/seed-type';

// Lazy-loaded seed modules — added as new seeds are created.
const SEED_MODULES: (() => Promise<{ default: WorkflowTemplateSeed }>)[] = [
  () => import('./seeds/notify-on-task-done.seed'),
  () => import('./seeds/webhook-relay.seed'),
  () => import('./seeds/ai-code-review.seed'),
  () => import('./seeds/github-pr-ready-check.seed'),
  () => import('./seeds/daily-digest.seed'),
  () => import('./seeds/ai-task-summariser.seed'),
  () => import('./seeds/scheduled-task-cleanup.seed'),
  () => import('./seeds/daily-standup.seed'),
];

export class TemplateNotFoundError extends Error {}
export class TemplateSlugTakenError extends Error {}
export class SystemTemplateDeleteError extends Error {}

const SLOT_SENTINEL = 'slot:';

@Injectable()
export class WorkflowTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowTemplatesService.name);

  constructor(
    @Inject(WorkflowTemplatesRepository) private readonly repo: WorkflowTemplatesRepository,
    @Inject(WorkflowsService) private readonly workflows: WorkflowsService,
    @Inject(WorkflowCredentialsService) private readonly credentials: WorkflowCredentialsService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Seed system templates on first boot — idempotent by slug.
    for (const loadSeed of SEED_MODULES) {
      try {
        const { default: seed } = await loadSeed();
        if (this.repo.findBySlug(seed.slug)) continue;
        const now = new Date().toISOString();
        this.repo.insert({
          id: randomUUID(),
          slug: seed.slug,
          name: seed.name,
          description: seed.description ?? null,
          category: seed.category,
          tags: JSON.stringify(seed.tags ?? []),
          credentialSlots: JSON.stringify(seed.credentialSlots ?? []),
          definition: JSON.stringify(seed.definition),
          thumbnail: seed.thumbnail ?? null,
          published: 1,
          authorId: null,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        });
        this.logger.log(`seeded system template "${seed.slug}"`);
      } catch (err) {
        this.logger.error({ err }, `failed to seed template`);
      }
    }
  }

  listTemplates(filter?: TemplateListFilter): WorkflowTemplateSummary[] {
    return this.repo.list(filter ?? {}).map((r) => this.repo.hydrateSummary(r));
  }

  getTemplate(id: string): WorkflowTemplate {
    const row = this.repo.findById(id) ?? this.repo.findBySlug(id);
    if (!row) throw new TemplateNotFoundError(`template ${id} not found`);
    return this.repo.hydrate(row);
  }

  createTemplate(req: CreateTemplateRequest, authorId: string): WorkflowTemplate {
    if (this.repo.findBySlug(req.slug)) throw new TemplateSlugTakenError(`slug "${req.slug}" is already taken`);
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id: randomUUID(),
      slug: req.slug,
      name: req.name,
      description: req.description ?? null,
      category: req.category,
      tags: JSON.stringify(req.tags),
      credentialSlots: JSON.stringify(req.credentialSlots),
      definition: JSON.stringify(req.definition),
      thumbnail: req.thumbnail ?? null,
      published: req.published ? 1 : 0,
      authorId,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return this.repo.hydrate(row);
  }

  updateTemplate(id: string, req: UpdateTemplateRequest, requesterId: string): WorkflowTemplate {
    const existing = this.repo.findById(id);
    if (!existing) throw new TemplateNotFoundError(`template ${id} not found`);
    if (existing.authorId === null) {
      throw new ForbiddenException('system templates cannot be edited');
    }
    if (existing.authorId !== requesterId) {
      throw new ForbiddenException('you can only edit your own templates');
    }
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (req.name !== undefined) patch.name = req.name;
    if (req.description !== undefined) patch.description = req.description;
    if (req.category !== undefined) patch.category = req.category;
    if (req.tags !== undefined) patch.tags = JSON.stringify(req.tags);
    if (req.credentialSlots !== undefined) patch.credentialSlots = JSON.stringify(req.credentialSlots);
    if (req.definition !== undefined) patch.definition = JSON.stringify(req.definition);
    if (req.thumbnail !== undefined) patch.thumbnail = req.thumbnail;
    if (req.published !== undefined) patch.published = req.published ? 1 : 0;
    const row = this.repo.update(id, patch as Parameters<typeof this.repo.update>[1]);
    if (!row) throw new TemplateNotFoundError(`template ${id} not found`);
    return this.repo.hydrate(row);
  }

  deleteTemplate(id: string, requesterId: string): void {
    const existing = this.repo.findById(id);
    if (!existing) throw new TemplateNotFoundError(`template ${id} not found`);
    if (existing.authorId === null) throw new SystemTemplateDeleteError('system templates cannot be deleted');
    if (existing.authorId !== requesterId) throw new ForbiddenException('you can only delete your own templates');
    this.repo.softDelete(id, new Date().toISOString());
  }

  getSlots(id: string): TemplateSlotsResponse {
    const template = this.getTemplate(id);
    const userCreds = this.credentials.list();
    const slots = template.credentialSlots.map((slot) => {
      const match = userCreds.find((c) => c.type === slot.type);
      return { ...slot, satisfiedBy: match?.id };
    });
    return { slots };
  }

  install(id: string, req: InstallTemplateRequest): Workflow {
    const template = this.getTemplate(id);
    const { credentialMap } = req;

    // Resolve slot sentinels in the definition's node params.
    const definition = template.definition as {
      trigger?: Record<string, unknown>;
      nodes?: Array<Record<string, unknown>>;
      edges?: Array<Record<string, unknown>>;
    };
    const resolvedNodes = (definition.nodes ?? []).map((node) => {
      const params = node.params as Record<string, unknown> | undefined;
      if (!params) return node;
      const resolved: Record<string, unknown> = { ...params };
      for (const [k, v] of Object.entries(resolved)) {
        if (typeof v === 'string' && v.startsWith(SLOT_SENTINEL)) {
          const slotKey = v.slice(SLOT_SENTINEL.length);
          resolved[k] = credentialMap[slotKey] ?? v;
        }
      }
      return { ...node, params: resolved };
    });

    const trigger = (definition.trigger as Record<string, unknown>) ?? { type: 'manual' };
    const name = req.name ?? template.name;
    const description = req.description ?? template.description;

    // Create the workflow via the existing service so all invariants hold.
    const workflow = this.workflows.create({
      name,
      description,
      trigger: trigger as Parameters<typeof this.workflows.create>[0]['trigger'],
    });

    // Patch the graph in with resolved nodes/edges.
    const graph = JSON.stringify({
      nodes: resolvedNodes,
      edges: definition.edges ?? [],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.workflows as any)['repo'].updateWorkflowRow(workflow.id, {
      graph,
      installedFromTemplateId: template.id,
      updatedAt: new Date().toISOString(),
    });

    return this.workflows.getWorkflow(workflow.id);
  }

  /**
   * Creates a new template from an existing workflow. Nodes with a real
   * `credentialId` param are replaced with `slot:<type>-<n>` sentinels and
   * a matching slot entry is added to `credentialSlots`.
   */
  createFromWorkflow(req: CreateFromWorkflowRequest, authorId: string): WorkflowTemplate {
    const workflow = this.workflows.getWorkflow(req.workflowId);

    // Build a credentialId→slot map from all nodes that carry a credentialId.
    const credById = new Map(this.credentials.list().map((c) => [c.id, c]));
    const slotByCredId = new Map<string, string>();
    const credentialSlots: Array<{ key: string; type: string; description?: string }> = [];

    let slotIndex = 0;
    for (const node of workflow.nodes) {
      const params = node.params as Record<string, unknown> | undefined;
      if (!params) continue;
      const credId = params['credentialId'];
      if (typeof credId !== 'string' || !credId || credId.startsWith(SLOT_SENTINEL)) continue;
      if (slotByCredId.has(credId)) continue;

      const cred = credById.get(credId);
      const type = cred?.type ?? 'unknown';
      const key = `${type}-${slotIndex++}`;
      slotByCredId.set(credId, key);
      credentialSlots.push({
        key,
        type,
        description: cred ? `${cred.name} (${cred.type})` : `Credential ${credId}`,
      });
    }

    // Re-write node params to replace real credentialIds with slot sentinels.
    const exportedNodes = workflow.nodes.map((node) => {
      const params = node.params as Record<string, unknown> | undefined;
      if (!params) return node;
      const credId = params['credentialId'];
      if (typeof credId !== 'string' || !slotByCredId.has(credId)) return node;
      return { ...node, params: { ...params, credentialId: `${SLOT_SENTINEL}${slotByCredId.get(credId)}` } };
    });

    const definition: Record<string, unknown> = {
      trigger: { ...workflow.trigger },
      nodes: exportedNodes,
      edges: workflow.edges,
    };

    // Derive a slug from the template name (or workflow name), deduplicating if needed.
    const baseName = req.name ?? workflow.name;
    const baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
    let slug = baseSlug;
    let n = 1;
    while (this.repo.findBySlug(slug)) {
      slug = `${baseSlug}-${n++}`;
    }

    return this.createTemplate(
      {
        slug,
        name: baseName,
        description: req.description,
        category: req.category,
        tags: req.tags,
        credentialSlots,
        definition,
        published: req.published,
      },
      authorId,
    );
  }
}
