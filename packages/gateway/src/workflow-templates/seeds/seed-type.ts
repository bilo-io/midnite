import type { WorkflowTemplateCategory, WorkflowTemplateCredentialSlot } from '@midnite/shared';

/** Shape that each seed file's default export must satisfy. */
export type WorkflowTemplateSeed = {
  slug: string;
  name: string;
  description?: string;
  category: WorkflowTemplateCategory;
  tags?: string[];
  credentialSlots?: WorkflowTemplateCredentialSlot[];
  /** { trigger, nodes, edges } — stored as-is. */
  definition: Record<string, unknown>;
  thumbnail?: string;
};
