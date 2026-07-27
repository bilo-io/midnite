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
