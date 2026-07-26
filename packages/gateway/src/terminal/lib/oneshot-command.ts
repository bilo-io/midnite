import type { AgentCli } from '@midnite/shared';

/**
 * The argv for a non-interactive one-shot run of each agent CLI: print the
 * response for a single prompt and exit. The prompt travels as one argv entry
 * (node-pty spawns without a shell), so no quoting/injection concerns.
 *
 * Gateway-internal spawn detail, not a wire contract — distinct from
 * AGENT_CLI_COMMAND in shared, which launches the *interactive* TUI.
 */
export function oneshotCommand(cli: AgentCli, prompt: string): { command: string; args: string[] } {
  switch (cli) {
    case 'claude':
      return { command: 'claude', args: ['-p', prompt] };
    case 'antigravity':
      // UNVERIFIED: agy has no documented non-interactive/headless mode (it's a
      // TUI that also opens a browser) — this is a best-effort guess at a plain
      // positional prompt. Confirm against the real binary and update if it
      // hangs or launches a browser instead of printing to stdout and exiting.
      return { command: 'agy', args: [prompt] };
    case 'codex':
      return { command: 'codex', args: ['exec', prompt] };
    case 'opencode':
      return { command: 'opencode', args: ['run', prompt] };
    case 'aider':
      // Aider has no pure print mode; --message + auto-yes approximates one.
      // --no-git because the cwd is not a meaningful repo for a debate.
      return { command: 'aider', args: ['--message', prompt, '--yes-always', '--no-git'] };
  }
}
