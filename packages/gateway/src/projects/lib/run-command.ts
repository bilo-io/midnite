import { shellQuote } from '../../terminal/terminal.service';

/**
 * The init line for a project's Preview/Build ad-hoc terminal: cd into the
 * project's work directory, clear the startup noise, then run the configured
 * command immediately. Unlike {@link buildInstallInitCommand} this auto-runs
 * (trailing `\r`) — the user already explicitly clicked Preview/Build, so there's
 * no need to wait for a second Enter. Pure/exported for testing.
 *
 * `cwd` is quoted via the terminal module's own `shellQuote` (single source of
 * truth for shell-safe path interpolation) — `command` is project-owner-authored
 * config (not end-user request input), so it's spliced in verbatim, same trust
 * boundary as `terminal.command` elsewhere in this module.
 */
export function buildRunInitCommand(cwd: string, command: string): string {
  return `cd ${shellQuote(cwd)} && clear && ${command}\r`;
}

/**
 * The spawn spec for a *background* Preview/Build run: the configured command
 * executed through a login shell (`-lc`, so PATH setup from the user's profile —
 * nvm, proto, etc. — applies) with the project's work directory as cwd. Fed to
 * `TerminalService.spawnManagedRun`, so the process is a gateway child: killing
 * midnite kills it. Same trust boundary as {@link buildRunInitCommand} — the
 * command is project-owner-authored config, spliced in verbatim.
 */
export function backgroundRunSpec(
  cwd: string,
  command: string,
  shell = process.env.SHELL || '/bin/sh',
): { command: string; args: string[]; cwd: string } {
  return { command: shell, args: ['-lc', command], cwd };
}
