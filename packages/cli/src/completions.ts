import type { Command } from 'commander';

// Phase 47 F — static shell-completion generators. `midnite completion <shell>`
// prints a script the user sources (print-and-source; no daemon, no runtime eval).
// The command tree is read from commander so completions never drift from the CLI.

export const SHELLS = ['bash', 'zsh', 'fish'] as const;
export type Shell = (typeof SHELLS)[number];

export function isShell(value: string): value is Shell {
  return (SHELLS as readonly string[]).includes(value);
}

interface CommandInfo {
  name: string;
  description: string;
  /** Sub-command names for a group command (task/workflow/template); [] otherwise. */
  children: string[];
}

/** The long-form global flags, always completable regardless of position. */
const GLOBAL_FLAGS = ['--gateway', '--token', '--json', '--help', '--version'];

/** Read the top-level commands (+ one level of sub-commands) from the program. */
export function collectCommands(program: Command): CommandInfo[] {
  return program.commands.map((c) => ({
    name: c.name(),
    description: c.description().replace(/\n/g, ' '),
    children: c.commands.map((sub) => sub.name()),
  }));
}

function bashScript(cmds: CommandInfo[]): string {
  const top = cmds.map((c) => c.name).join(' ');
  const groupCases = cmds
    .filter((c) => c.children.length > 0)
    .map((c) => `    ${c.name}) COMPREPLY=( $(compgen -W "${c.children.join(' ')}" -- "$cur") ); return;;`)
    .join('\n');
  return `# midnite bash completion — source this file (or add to ~/.bashrc):
#   source <(midnite completion bash)
_midnite() {
  local cur prev words cword
  _get_comp_words_by_ref -n : cur prev words cword 2>/dev/null || {
    cur="\${COMP_WORDS[COMP_CWORD]}"; prev="\${COMP_WORDS[COMP_CWORD-1]}";
  }
  if [[ "$cur" == -* ]]; then
    COMPREPLY=( $(compgen -W "${GLOBAL_FLAGS.join(' ')}" -- "$cur") ); return
  fi
  case "$prev" in
${groupCases}
  esac
  COMPREPLY=( $(compgen -W "${top}" -- "$cur") )
}
complete -F _midnite midnite
`;
}

function zshScript(cmds: CommandInfo[]): string {
  const describe = cmds
    .map((c) => `    '${c.name}:${c.description.replace(/'/g, '')}'`)
    .join('\n');
  const groupCases = cmds
    .filter((c) => c.children.length > 0)
    .map((c) => `        ${c.name}) compadd ${c.children.join(' ')} ;;`)
    .join('\n');
  return `#compdef midnite
# midnite zsh completion — source this file (or add to your fpath):
#   source <(midnite completion zsh)
_midnite() {
  local -a _cmds
  _cmds=(
${describe}
  )
  if (( CURRENT == 2 )); then
    _describe 'command' _cmds
    return
  fi
  case "\${words[2]}" in
${groupCases}
  esac
  _values 'flags' ${GLOBAL_FLAGS.map((f) => `'${f}'`).join(' ')}
}
compdef _midnite midnite
`;
}

function fishScript(cmds: CommandInfo[]): string {
  const lines: string[] = [
    '# midnite fish completion — save to ~/.config/fish/completions/midnite.fish:',
    '#   midnite completion fish > ~/.config/fish/completions/midnite.fish',
    '# top-level commands (only when no subcommand chosen yet)',
  ];
  for (const c of cmds) {
    lines.push(
      `complete -c midnite -n __fish_use_subcommand -a ${c.name} -d '${c.description.replace(/'/g, '')}'`,
    );
  }
  for (const c of cmds.filter((g) => g.children.length > 0)) {
    lines.push(`# subcommands of \`${c.name}\``);
    for (const child of c.children) {
      lines.push(`complete -c midnite -n '__fish_seen_subcommand_from ${c.name}' -a ${child}`);
    }
  }
  lines.push('# global flags');
  for (const flag of GLOBAL_FLAGS) {
    lines.push(`complete -c midnite -l ${flag.replace(/^--/, '')}`);
  }
  return `${lines.join('\n')}\n`;
}

/** Render the completion script for `shell` from the program's command tree. */
export function generateCompletion(program: Command, shell: Shell): string {
  const cmds = collectCommands(program);
  switch (shell) {
    case 'bash':
      return bashScript(cmds);
    case 'zsh':
      return zshScript(cmds);
    case 'fish':
      return fishScript(cmds);
  }
}
