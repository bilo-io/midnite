import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from '../db/schema';
import { WorkflowTemplatesRepository } from './workflow-templates.repository';
import {
  SystemTemplateDeleteError,
  TemplateNotFoundError,
  TemplateSlugTakenError,
  WorkflowTemplatesService,
} from './workflow-templates.service';
import type { WorkflowsService } from '../workflows/workflows.service';
import type { WorkflowCredentialsService } from '../workflows/credentials/workflow-credentials.service';
import type { Workflow } from '@midnite/shared';

function makeDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  return db;
}

const STUB_WORKFLOW: Workflow = {
  id: 'wf-stub',
  name: 'Stub',
  enabled: false,
  trigger: { type: 'manual' },
  nodes: [],
  edges: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeWorkflowsService(): WorkflowsService {
  return {
    create: vi.fn().mockReturnValue(STUB_WORKFLOW),
    getWorkflow: vi.fn().mockReturnValue(STUB_WORKFLOW),
    repo: {
      updateWorkflowRow: vi.fn(),
    },
  } as unknown as WorkflowsService;
}

function makeCredentialsService(): WorkflowCredentialsService {
  return {
    list: vi.fn().mockReturnValue([]),
  } as unknown as WorkflowCredentialsService;
}

const BASE_TEMPLATE = {
  slug: 'test-template',
  name: 'Test Template',
  description: 'A test template',
  category: 'monitoring' as const,
  tags: ['test'],
  credentialSlots: [],
  definition: { trigger: { type: 'manual' }, nodes: [], edges: [] },
  thumbnail: undefined,
  published: true,
};

describe('WorkflowTemplatesRepository', () => {
  let repo: WorkflowTemplatesRepository;

  beforeEach(() => {
    const db = makeDb();
    repo = new WorkflowTemplatesRepository(db);
  });

  it('inserts and retrieves a template', () => {
    const now = '2026-01-01T00:00:00.000Z';
    const row = repo.insert({
      id: 'tpl-1',
      slug: BASE_TEMPLATE.slug,
      name: BASE_TEMPLATE.name,
      description: BASE_TEMPLATE.description ?? null,
      category: BASE_TEMPLATE.category,
      tags: JSON.stringify(BASE_TEMPLATE.tags),
      credentialSlots: '[]',
      definition: JSON.stringify(BASE_TEMPLATE.definition),
      thumbnail: null,
      published: 1,
      authorId: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(row.id).toBe('tpl-1');
    expect(repo.findById('tpl-1')).toBeDefined();
    expect(repo.findBySlug(BASE_TEMPLATE.slug)).toBeDefined();
  });

  it('hydrate returns parsed fields', () => {
    const now = '2026-01-01T00:00:00.000Z';
    const row = repo.insert({
      id: 'tpl-2',
      slug: 'hydrate-test',
      name: 'Hydrate Test',
      description: 'desc',
      category: 'github',
      tags: JSON.stringify(['a', 'b']),
      credentialSlots: JSON.stringify([{ key: 'tok', type: 'github', description: 'test' }]),
      definition: JSON.stringify({ trigger: { type: 'webhook' }, nodes: [] }),
      thumbnail: null,
      published: 1,
      authorId: 'user-1',
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const tpl = repo.hydrate(row);
    expect(tpl.tags).toEqual(['a', 'b']);
    expect(tpl.credentialSlots).toHaveLength(1);
    expect(tpl.credentialSlots[0].key).toBe('tok');
    expect(tpl.published).toBe(true);
  });

  it('list filters by category', () => {
    const now = '2026-01-01T00:00:00.000Z';
    repo.insert({ id: 't1', slug: 'github-one', name: 'G1', description: null, category: 'github', tags: '[]', credentialSlots: '[]', definition: '{}', thumbnail: null, published: 1, authorId: null, deletedAt: null, createdAt: now, updatedAt: now });
    repo.insert({ id: 't2', slug: 'notify-one', name: 'N1', description: null, category: 'notifications', tags: '[]', credentialSlots: '[]', definition: '{}', thumbnail: null, published: 1, authorId: null, deletedAt: null, createdAt: now, updatedAt: now });

    const github = repo.list({ category: 'github' });
    expect(github).toHaveLength(1);
    expect(github[0].slug).toBe('github-one');
  });

  it('list filters by published', () => {
    const now = '2026-01-01T00:00:00.000Z';
    repo.insert({ id: 't3', slug: 'pub', name: 'Pub', description: null, category: 'ai', tags: '[]', credentialSlots: '[]', definition: '{}', thumbnail: null, published: 1, authorId: null, deletedAt: null, createdAt: now, updatedAt: now });
    repo.insert({ id: 't4', slug: 'draft', name: 'Draft', description: null, category: 'ai', tags: '[]', credentialSlots: '[]', definition: '{}', thumbnail: null, published: 0, authorId: null, deletedAt: null, createdAt: now, updatedAt: now });

    expect(repo.list({ published: true })).toHaveLength(1);
    expect(repo.list({ published: false })).toHaveLength(1);
  });

  it('softDelete hides template from list', () => {
    const now = '2026-01-01T00:00:00.000Z';
    repo.insert({ id: 't5', slug: 'to-delete', name: 'TD', description: null, category: 'data', tags: '[]', credentialSlots: '[]', definition: '{}', thumbnail: null, published: 1, authorId: 'u1', deletedAt: null, createdAt: now, updatedAt: now });
    repo.softDelete('t5', now);

    expect(repo.findById('t5')).toBeUndefined();
    expect(repo.list()).toHaveLength(0);
  });
});

describe('WorkflowTemplatesService', () => {
  let repo: WorkflowTemplatesRepository;
  let service: WorkflowTemplatesService;
  let workflowsSvc: WorkflowsService;

  beforeEach(() => {
    const db = makeDb();
    repo = new WorkflowTemplatesRepository(db);
    workflowsSvc = makeWorkflowsService();
    service = new WorkflowTemplatesService(repo, workflowsSvc, makeCredentialsService());
  });

  it('onModuleInit seeds built-in templates', async () => {
    await service.onModuleInit();
    const list = service.listTemplates();
    expect(list.some((t) => t.slug === 'notify-on-task-done')).toBe(true);
    expect(list.some((t) => t.slug === 'webhook-relay')).toBe(true);
    expect(list.some((t) => t.slug === 'ai-code-review')).toBe(true);
  });

  it('onModuleInit is idempotent — does not duplicate slugs', async () => {
    await service.onModuleInit();
    await service.onModuleInit();
    const list = service.listTemplates();
    const aiReviewCount = list.filter((t) => t.slug === 'ai-code-review').length;
    expect(aiReviewCount).toBe(1);
  });

  it('getTemplate by id and by slug', async () => {
    await service.onModuleInit();
    const list = service.listTemplates();
    const first = list[0];
    expect(service.getTemplate(first.id).id).toBe(first.id);
    expect(service.getTemplate(first.slug).slug).toBe(first.slug);
  });

  it('getTemplate throws TemplateNotFoundError for unknown id', () => {
    expect(() => service.getTemplate('missing')).toThrow(TemplateNotFoundError);
  });

  it('createTemplate adds a new template', () => {
    const tpl = service.createTemplate(
      {
        slug: 'my-template',
        name: 'My Template',
        category: 'monitoring',
        tags: [],
        credentialSlots: [],
        definition: { trigger: { type: 'manual' }, nodes: [], edges: [] },
        published: false,
      },
      'author-1',
    );
    expect(tpl.slug).toBe('my-template');
    expect(tpl.authorId).toBe('author-1');
  });

  it('createTemplate throws TemplateSlugTakenError for duplicate slug', () => {
    service.createTemplate(
      { slug: 'dup', name: 'Dup', category: 'ai', tags: [], credentialSlots: [], definition: {}, published: true },
      'author-1',
    );
    expect(() =>
      service.createTemplate(
        { slug: 'dup', name: 'Dup2', category: 'ai', tags: [], credentialSlots: [], definition: {}, published: true },
        'author-1',
      ),
    ).toThrow(TemplateSlugTakenError);
  });

  it('deleteTemplate blocks system templates', async () => {
    await service.onModuleInit();
    const tpl = service.getTemplate('notify-on-task-done');
    expect(() => service.deleteTemplate(tpl.id, 'anyone')).toThrow(SystemTemplateDeleteError);
  });

  it('deleteTemplate allows author-owned templates', () => {
    const tpl = service.createTemplate(
      { slug: 'owned', name: 'Owned', category: 'data', tags: [], credentialSlots: [], definition: {}, published: false },
      'author-1',
    );
    service.deleteTemplate(tpl.id, 'author-1');
    expect(() => service.getTemplate(tpl.id)).toThrow(TemplateNotFoundError);
  });

  it('install resolves slot sentinels and creates workflow', async () => {
    await service.onModuleInit();
    const tpl = service.getTemplate('notify-on-task-done');
    const result = service.install(tpl.id, {
      credentialMap: { 'slack-workspace': 'cred-123' },
    });
    expect(workflowsSvc.create).toHaveBeenCalledWith(expect.objectContaining({ name: tpl.name }));
    expect(result).toBeDefined();
  });

  it('getSlots returns slot metadata', async () => {
    await service.onModuleInit();
    const tpl = service.getTemplate('ai-code-review');
    const slots = service.getSlots(tpl.id);
    expect(slots.slots).toHaveLength(1);
    expect(slots.slots[0].key).toBe('github-token');
  });
});
