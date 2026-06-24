import { z } from 'zod';

// ── Credential slots ──────────────────────────────────────────────────────────

export const WorkflowTemplateCredentialSlotSchema = z.object({
  /** Short machine key used in node params as `credentialId: "slot:<key>"`. */
  key: z.string().min(1).max(60),
  /** Must match a `WorkflowCredentialType` — validated by the install flow. */
  type: z.string().min(1),
  /** Human-readable description shown in the install UI. */
  description: z.string().max(300).optional(),
});
export type WorkflowTemplateCredentialSlot = z.infer<typeof WorkflowTemplateCredentialSlotSchema>;

// ── Template categories ───────────────────────────────────────────────────────

export const WORKFLOW_TEMPLATE_CATEGORIES = [
  'monitoring',
  'notifications',
  'github',
  'scheduling',
  'ai',
  'data',
] as const;
export const WorkflowTemplateCategorySchema = z.enum(WORKFLOW_TEMPLATE_CATEGORIES);
export type WorkflowTemplateCategory = z.infer<typeof WorkflowTemplateCategorySchema>;

// ── Full template (returned by GET /:id) ─────────────────────────────────────

export const WorkflowTemplateSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: WorkflowTemplateCategorySchema,
  tags: z.array(z.string()),
  credentialSlots: z.array(WorkflowTemplateCredentialSlotSchema),
  /** The workflow definition: { trigger, nodes, edges } — same shape as Workflow.graph */
  definition: z.record(z.unknown()),
  thumbnail: z.string().optional(),
  published: z.boolean(),
  /** null for built-in system templates. */
  authorId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

/** Lightweight list view — no full definition. */
export const WorkflowTemplateSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: WorkflowTemplateCategorySchema,
  tags: z.array(z.string()),
  credentialSlots: z.array(WorkflowTemplateCredentialSlotSchema),
  thumbnail: z.string().optional(),
  published: z.boolean(),
  authorId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkflowTemplateSummary = z.infer<typeof WorkflowTemplateSummarySchema>;

// ── CRUD requests ─────────────────────────────────────────────────────────────

export const CreateTemplateRequestSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric and hyphens only'),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional(),
  category: WorkflowTemplateCategorySchema,
  tags: z.array(z.string().max(40)).max(10).default([]),
  credentialSlots: z.array(WorkflowTemplateCredentialSlotSchema).default([]),
  definition: z.record(z.unknown()),
  thumbnail: z.string().max(4096).optional(),
  published: z.boolean().default(false),
});
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>;

export const UpdateTemplateRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().max(1000).optional(),
    category: WorkflowTemplateCategorySchema.optional(),
    tags: z.array(z.string().max(40)).max(10).optional(),
    credentialSlots: z.array(WorkflowTemplateCredentialSlotSchema).optional(),
    definition: z.record(z.unknown()).optional(),
    thumbnail: z.string().max(4096).optional(),
    published: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.description !== undefined ||
      v.category !== undefined ||
      v.tags !== undefined ||
      v.credentialSlots !== undefined ||
      v.definition !== undefined ||
      v.thumbnail !== undefined ||
      v.published !== undefined,
    { message: 'at least one field is required' },
  );
export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateRequestSchema>;

// ── Create from workflow ──────────────────────────────────────────────────────

export const CreateFromWorkflowRequestSchema = z.object({
  workflowId: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  category: WorkflowTemplateCategorySchema,
  tags: z.array(z.string().max(40)).max(10).default([]),
  published: z.boolean().default(false),
});
export type CreateFromWorkflowRequest = z.infer<typeof CreateFromWorkflowRequestSchema>;

// ── Install flow ──────────────────────────────────────────────────────────────

export const InstallTemplateRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  /** Maps slot.key → actual credential ID. Slots not listed are left unresolved (warning in editor). */
  credentialMap: z.record(z.string()).default({}),
});
export type InstallTemplateRequest = z.infer<typeof InstallTemplateRequestSchema>;

// ── API responses ─────────────────────────────────────────────────────────────

export const WorkflowTemplateResponseSchema = z.object({ template: WorkflowTemplateSchema });
export type WorkflowTemplateResponse = z.infer<typeof WorkflowTemplateResponseSchema>;

export const WorkflowTemplatesResponseSchema = z.object({
  templates: z.array(WorkflowTemplateSummarySchema),
});
export type WorkflowTemplatesResponse = z.infer<typeof WorkflowTemplatesResponseSchema>;

export const TemplateSlotsResponseSchema = z.object({
  slots: z.array(
    WorkflowTemplateCredentialSlotSchema.extend({
      /** Credential ID that satisfies this slot (user has a matching type), if any. */
      satisfiedBy: z.string().optional(),
    }),
  ),
});
export type TemplateSlotsResponse = z.infer<typeof TemplateSlotsResponseSchema>;
