import { z } from 'zod';

export const RepoConfigSchema = z.object({
  name: z.string(),
  path: z.string(),
});

export const AgentConfigSchema = z.object({
  pool: z.number().int().positive().default(4),
  provider: z.enum(['claude']).default('claude'),
  plan: z.string().default('opus4.7'),
  act: z.string().default('sonnet4.7'),
});

export const TerminalConfigSchema = z.object({
  mode: z.enum(['pty', 'tmux', 'warp', 'iterm']).default('pty'),
  layout: z.enum(['split', 'tabs', 'windows']).default('split'),
});

export const KnowledgeConfigSchema = z.object({
  dir: z.string().default('./knowledge'),
});

export const GatewayConfigSchema = z.object({
  port: z.number().int().positive().default(7777),
  uploadsDir: z.string().default('./.midnite/uploads'),
  dbPath: z.string().default('./.midnite/midnite.db'),
});

export const MidniteConfigSchema = z.object({
  agent: AgentConfigSchema,
  terminal: TerminalConfigSchema,
  knowledge: KnowledgeConfigSchema,
  repos: z.array(RepoConfigSchema).default([]),
  gateway: GatewayConfigSchema,
});

export type MidniteConfig = z.infer<typeof MidniteConfigSchema>;
export type RepoConfig = z.infer<typeof RepoConfigSchema>;

export function parseConfig(raw: unknown): MidniteConfig {
  return MidniteConfigSchema.parse(raw);
}

export async function loadConfig(_path: string): Promise<MidniteConfig> {
  throw new Error('loadConfig() not implemented yet — see packages/gateway for the runtime loader');
}
