import type { MidniteConfig } from '@midnite/shared';

/**
 * The names of the gateway's OWN secret env vars (Phase 50 C). Config-driven so a
 * non-default env-var name (`gateway.auth.tokenEnv` etc) is still covered. The
 * single source of truth for "which env vars are the gateway's master secrets" —
 * reused by the spawn-env scrub (terminal) and the workflow expression sandbox
 * (`$env`) so a new secret can't leak through one path after being added to the
 * other. Deliberately narrow: it names only midnite's own secrets, NOT the
 * agent's provider auth (`ANTHROPIC_API_KEY` etc) — the agent still needs those.
 */
export function gatewaySecretEnvNames(config: MidniteConfig): string[] {
  return [
    'MIDNITE_SECRET_KEY',
    config.gateway.auth.tokenEnv,
    config.gateway.auth.jwt.secretEnv,
    config.workflows.encryptionKeyEnv,
  ];
}

/** Remove the gateway's own secrets from an env map (mutates + returns `env`). */
export function scrubGatewaySecrets(
  env: Record<string, string>,
  config: MidniteConfig,
): Record<string, string> {
  for (const name of gatewaySecretEnvNames(config)) delete env[name];
  return env;
}
