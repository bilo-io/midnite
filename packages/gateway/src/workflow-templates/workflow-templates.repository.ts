import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import type { WorkflowTemplate, WorkflowTemplateSummary } from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { workflowTemplates, type WorkflowTemplateInsert, type WorkflowTemplateRow } from '../db/schema';

export type TemplateListFilter = {
  category?: string;
  published?: boolean;
  authorId?: string | null;
};

@Injectable()
export class WorkflowTemplatesRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: WorkflowTemplateInsert): WorkflowTemplateRow {
    return this.db.insert(workflowTemplates).values(row).returning().get();
  }

  findById(id: string): WorkflowTemplateRow | undefined {
    return this.db
      .select()
      .from(workflowTemplates)
      .where(and(eq(workflowTemplates.id, id), isNull(workflowTemplates.deletedAt)))
      .get();
  }

  findBySlug(slug: string): WorkflowTemplateRow | undefined {
    return this.db
      .select()
      .from(workflowTemplates)
      .where(and(eq(workflowTemplates.slug, slug), isNull(workflowTemplates.deletedAt)))
      .get();
  }

  list(filter: TemplateListFilter = {}): WorkflowTemplateRow[] {
    const conditions = [isNull(workflowTemplates.deletedAt)];
    if (filter.category) conditions.push(eq(workflowTemplates.category, filter.category));
    if (filter.published !== undefined) {
      conditions.push(eq(workflowTemplates.published, filter.published ? 1 : 0));
    }
    if (filter.authorId !== undefined) {
      if (filter.authorId === null) {
        conditions.push(isNull(workflowTemplates.authorId));
      } else {
        conditions.push(eq(workflowTemplates.authorId, filter.authorId));
      }
    }
    return this.db
      .select()
      .from(workflowTemplates)
      .where(and(...conditions))
      .all();
  }

  update(id: string, patch: Partial<WorkflowTemplateInsert>): WorkflowTemplateRow | undefined {
    return this.db
      .update(workflowTemplates)
      .set(patch)
      .where(eq(workflowTemplates.id, id))
      .returning()
      .get();
  }

  softDelete(id: string, deletedAt: string): WorkflowTemplateRow | undefined {
    return this.db
      .update(workflowTemplates)
      .set({ deletedAt })
      .where(eq(workflowTemplates.id, id))
      .returning()
      .get();
  }

  hydrate(row: WorkflowTemplateRow): WorkflowTemplate {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category as WorkflowTemplate['category'],
      tags: JSON.parse(row.tags) as string[],
      credentialSlots: JSON.parse(row.credentialSlots) as WorkflowTemplate['credentialSlots'],
      definition: JSON.parse(row.definition) as Record<string, unknown>,
      thumbnail: row.thumbnail ?? undefined,
      published: row.published === 1,
      authorId: row.authorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateSummary(row: WorkflowTemplateRow): WorkflowTemplateSummary {
    const full = this.hydrate(row);
    return {
      id: full.id,
      slug: full.slug,
      name: full.name,
      description: full.description,
      category: full.category,
      tags: full.tags,
      credentialSlots: full.credentialSlots,
      thumbnail: full.thumbnail,
      published: full.published,
      authorId: full.authorId,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
    };
  }
}
