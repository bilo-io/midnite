import { z } from 'zod';

// The OS targets the environment checker tabs for. Tools are detected and
// installed on the gateway host, so the "current" OS is the gateway's, not the
// browser's.
export const ENV_OSES = ['mac', 'windows', 'linux'] as const;
export const EnvOsSchema = z.enum(ENV_OSES);
export type EnvOs = z.infer<typeof EnvOsSchema>;

/** The host OS in a response — one of the tabbed targets, or `other`. */
export const EnvHostOsSchema = z.enum(['mac', 'windows', 'linux', 'other']);
export type EnvHostOs = z.infer<typeof EnvHostOsSchema>;

export const ENV_OS_LABEL: Record<EnvOs, string> = {
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

// The system tools midnite needs locally. Detected/installed where the gateway
// runs (that's where session PTYs spawn).
export const ENV_TOOL_IDS = ['homebrew', 'node', 'proto', 'moon'] as const;
export const EnvToolIdSchema = z.enum(ENV_TOOL_IDS);
export type EnvToolId = z.infer<typeof EnvToolIdSchema>;

/** What an environment terminal does — distinct from the CLI actions: no
 *  `launch`, and a dedicated `update` (env tools update differently than they
 *  install — `brew update` vs the install script). */
export const ENV_TOOL_ACTIONS = ['install', 'update', 'uninstall'] as const;
export const EnvToolActionSchema = z.enum(ENV_TOOL_ACTIONS);
export type EnvToolAction = z.infer<typeof EnvToolActionSchema>;

export type EnvToolMeta = {
  id: EnvToolId;
  label: string;
  /** One-line description of what the tool is for. */
  description: string;
  /** Minimum acceptable major version, if any (5 → Homebrew, 22 → Node). */
  minVersion?: number;
  /**
   * Bare binary name. The detector probes it through a login shell and appends
   * `--version` itself — so this must be just `brew`, not `brew --version`.
   */
  command: string;
  installCommand: string;
  updateCommand: string;
  uninstallCommand: string;
  homepageUrl: string;
  /** Another tool this one is installed through, surfaced as a hint. */
  via?: EnvToolId;
};

// macOS toolset, in dependency order (proto precedes the tools it manages).
const MAC_TOOLS: EnvToolMeta[] = [
  {
    id: 'homebrew',
    label: 'Homebrew',
    description: 'The macOS package manager.',
    minVersion: 5,
    command: 'brew',
    installCommand:
      '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
    updateCommand: 'brew update',
    uninstallCommand:
      '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"',
    homepageUrl: 'https://brew.sh',
  },
  {
    id: 'proto',
    label: 'proto',
    description: 'Pins and installs Node, pnpm and moon from .prototools.',
    command: 'proto',
    installCommand: 'bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)',
    updateCommand: 'proto upgrade',
    uninstallCommand: 'rm -rf ~/.proto',
    homepageUrl: 'https://moonrepo.dev/proto',
  },
  {
    id: 'node',
    label: 'Node.js',
    description: 'JavaScript runtime, managed by proto.',
    minVersion: 22,
    command: 'node',
    installCommand: 'proto install node',
    updateCommand: 'proto install node',
    uninstallCommand: 'proto uninstall node',
    homepageUrl: 'https://nodejs.org',
    via: 'proto',
  },
  {
    id: 'moon',
    label: 'moon',
    description: 'The monorepo task runner, managed by proto.',
    command: 'moon',
    installCommand: 'proto install moon',
    updateCommand: 'proto install moon',
    uninstallCommand: 'proto uninstall moon',
    homepageUrl: 'https://moonrepo.dev/moon',
    via: 'proto',
  },
];

/** Tools per OS. Only macOS is populated for now; Windows/Linux are reference
 *  placeholders to fill in later. */
export const ENV_TOOLS_BY_OS: Record<EnvOs, EnvToolMeta[]> = {
  mac: MAC_TOOLS,
  windows: [],
  linux: [],
};

/** Look up one tool's metadata across all OSes. */
export function envToolMeta(id: EnvToolId): EnvToolMeta | undefined {
  for (const tools of Object.values(ENV_TOOLS_BY_OS)) {
    const found = tools.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Installed-state of a tool, detected by probing its binary on PATH. */
export const EnvToolStatusSchema = z.object({
  id: EnvToolIdSchema,
  installed: z.boolean(),
  version: z.string().optional(),
});
export type EnvToolStatus = z.infer<typeof EnvToolStatusSchema>;

/** The gateway host OS plus the live status of every tool for that OS. */
export const EnvironmentResponseSchema = z.object({
  os: EnvHostOsSchema,
  tools: z.array(EnvToolStatusSchema),
});
export type EnvironmentResponse = z.infer<typeof EnvironmentResponseSchema>;

/**
 * Whether `version` (e.g. "5.1.15", "22.12.0") satisfies a minimum major
 * version. Compares the leading integer. Returns true when no minimum is set,
 * and — to avoid crying wolf on odd version strings — when the version can't be
 * parsed; returns false only when a required version is clearly below the floor.
 */
export function meetsMinVersion(version: string | undefined, min: number | undefined): boolean {
  if (min === undefined) return true;
  if (!version) return false;
  const match = version.match(/\d+/);
  if (!match) return true;
  return Number(match[0]) >= min;
}
