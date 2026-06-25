import { z } from 'zod';

/**
 * Service account tokens (Phase 38 Theme B).
 *
 * Machine-readable API keys for CI/CD pipelines, scripts, and third-party
 * integrations that need to call the gateway without a user session. The raw
 * token (`mnt_<hex>`) is returned ONCE at creation time and never stored;
 * all subsequent API calls use it as a Bearer token.
 */

export const ServiceTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** First 8 chars of the raw token — shown in list views to identify it. */
  prefix: z.string(),
  teamId: z.string().optional(),
  createdBy: z.string().optional(),
  lastUsedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
});
export type ServiceToken = z.infer<typeof ServiceTokenSchema>;

export const CreateServiceTokenRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  /** ISO-8601 datetime; if omitted the token never expires. */
  expiresAt: z.string().datetime().optional(),
});
export type CreateServiceTokenRequest = z.infer<typeof CreateServiceTokenRequestSchema>;

export const CreateServiceTokenResponseSchema = z.object({
  token: ServiceTokenSchema,
  /** The raw token — shown ONCE. Store it securely. */
  secret: z.string(),
});
export type CreateServiceTokenResponse = z.infer<typeof CreateServiceTokenResponseSchema>;

export const ListServiceTokensResponseSchema = z.object({
  tokens: z.array(ServiceTokenSchema),
});
export type ListServiceTokensResponse = z.infer<typeof ListServiceTokensResponseSchema>;
