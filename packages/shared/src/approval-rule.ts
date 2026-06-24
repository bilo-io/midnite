import { z } from 'zod';

// ---- Rule model ----

export const ApprovalRuleMatchSchema = z
  .object({
    /** Allowed command prefixes for Bash calls (e.g. ['git status', 'pnpm test']). */
    commandPrefix: z.array(z.string()).optional(),
    /** Glob patterns for file-targeting tools (Read/Write/Edit). */
    pathGlob: z.array(z.string()).optional(),
  })
  .optional();
export type ApprovalRuleMatch = NonNullable<z.infer<typeof ApprovalRuleMatchSchema>>;

export const ApprovalRuleEffectSchema = z.enum(['allow', 'deny']);
export type ApprovalRuleEffect = z.infer<typeof ApprovalRuleEffectSchema>;

/** A durable tool-approval rule. `toolName` may be `'*'` to match all tools.
 *  `scope` is always `'global'` this phase — per-repo scoping is deferred. */
export const ApprovalRuleSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  effect: ApprovalRuleEffectSchema,
  /** Tool name matched against `tool_name` in the hook payload, or `'*'`. */
  toolName: z.string(),
  /** Optional narrowing conditions within the tool call. */
  match: ApprovalRuleMatchSchema,
  scope: z.literal('global'),
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApprovalRule = z.infer<typeof ApprovalRuleSchema>;

export const CreateApprovalRuleSchema = ApprovalRuleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateApprovalRule = z.infer<typeof CreateApprovalRuleSchema>;

export const UpdateApprovalRuleSchema = CreateApprovalRuleSchema.partial();
export type UpdateApprovalRule = z.infer<typeof UpdateApprovalRuleSchema>;

// ---- Wire shapes ----

export const ApprovalRuleResponseSchema = z.object({ rule: ApprovalRuleSchema });
export type ApprovalRuleResponse = z.infer<typeof ApprovalRuleResponseSchema>;

export const ApprovalRulesResponseSchema = z.object({ rules: z.array(ApprovalRuleSchema) });
export type ApprovalRulesResponse = z.infer<typeof ApprovalRulesResponseSchema>;
