import { z } from 'zod';

// Credential kinds an integration/HTTP node can reference. The secret payload shape
// is keyed off this discriminant (see WorkflowCredentialDataSchema). Adding a kind is
// one entry here + one branch below + (later) the executor that consumes it.
export const WORKFLOW_CREDENTIAL_TYPES = [
  'http-bearer',
  'http-basic',
  'http-header',
  'slack',
  'smtp',
  'github',
] as const;
export const WorkflowCredentialTypeSchema = z.enum(WORKFLOW_CREDENTIAL_TYPES);
export type WorkflowCredentialType = z.infer<typeof WorkflowCredentialTypeSchema>;

// The secret material, one shape per type. Stored AES-256-GCM-encrypted at rest and
// resolved server-side at node-run time — **never** serialised back to a client. The
// `type` discriminant doubles as the credential's stored type, so it has one home.
export const WorkflowCredentialDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('http-bearer'), token: z.string().min(1) }),
  z.object({
    type: z.literal('http-basic'),
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  z.object({
    type: z.literal('http-header'),
    header: z.string().min(1),
    value: z.string().min(1),
  }),
  z.object({ type: z.literal('slack'), token: z.string().min(1) }),
  z.object({
    type: z.literal('github'),
    token: z.string().min(1),
    enterpriseUrl: z.string().url().optional(),
  }),
  z.object({
    type: z.literal('smtp'),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    username: z.string().min(1),
    password: z.string().min(1),
    from: z.string().min(1).optional(),
    secure: z.boolean().optional(),
  }),
]);
export type WorkflowCredentialData = z.infer<typeof WorkflowCredentialDataSchema>;

// The public, secret-free view returned over the API — names + types only.
export const WorkflowCredentialSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  type: WorkflowCredentialTypeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkflowCredential = z.infer<typeof WorkflowCredentialSchema>;

// Create carries the secret `data`; the credential's `type` is derived from it so the
// discriminant lives in exactly one place. No update route in this slice — secrets are
// replace-by-delete-and-recreate, which keeps the encrypted blob immutable once written.
export const CreateWorkflowCredentialRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  data: WorkflowCredentialDataSchema,
});
export type CreateWorkflowCredentialRequest = z.infer<
  typeof CreateWorkflowCredentialRequestSchema
>;

export const WorkflowCredentialResponseSchema = z.object({ credential: WorkflowCredentialSchema });
export type WorkflowCredentialResponse = z.infer<typeof WorkflowCredentialResponseSchema>;

export const WorkflowCredentialsResponseSchema = z.object({
  credentials: z.array(WorkflowCredentialSchema),
});
export type WorkflowCredentialsResponse = z.infer<typeof WorkflowCredentialsResponseSchema>;
