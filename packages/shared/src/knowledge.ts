import { z } from 'zod';
import { SOURCE_KINDS } from './source.js';

// The global knowledge base: link sources (with favicon + title from Open Graph)
// that apply to every project on top of its own sources. A project's own source
// for the same URL overrides the global one. Mirrors a project source minus the
// `projectId` scope.

export const MAX_GLOBAL_SOURCES = 20;

export const GlobalSourceSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  kind: z.enum(SOURCE_KINDS),
  title: z.string().optional(),
  faviconUrl: z.string().optional(),
  fetchedAt: z.string().optional(),
  createdAt: z.string(),
});

export const AddGlobalSourceRequestSchema = z.object({ url: z.string().url() });

export const GlobalSourcesResponseSchema = z.object({
  sources: z.array(GlobalSourceSchema),
});

export type GlobalSource = z.infer<typeof GlobalSourceSchema>;
export type AddGlobalSourceRequest = z.infer<typeof AddGlobalSourceRequestSchema>;
export type GlobalSourcesResponse = z.infer<typeof GlobalSourcesResponseSchema>;
