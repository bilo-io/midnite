import { describe, expect, it } from 'vitest';
import { Command } from 'commander';

import { collectCommands, generateCompletion, isShell, SHELLS } from './completions';

function buildProgram(): Command {
  const program = new Command();
  program.name('midnite');
  program.command('list').description('List tasks');
  program.command('move [id] [status]').description('Move a task');
  const wf = program.command('workflow').description('Workflows');
  wf.command('list').description('List workflows');
  wf.command('run <id>').description('Run a workflow');
  return program;
}

describe('isShell', () => {
  it('accepts the three supported shells and rejects others', () => {
    expect(SHELLS).toEqual(['bash', 'zsh', 'fish']);
    expect(isShell('bash')).toBe(true);
    expect(isShell('powershell')).toBe(false);
  });
});

describe('collectCommands', () => {
  it('reads top commands and one level of children', () => {
    const cmds = collectCommands(buildProgram());
    const wf = cmds.find((c) => c.name === 'workflow');
    expect(cmds.map((c) => c.name)).toEqual(expect.arrayContaining(['list', 'move', 'workflow']));
    expect(wf?.children).toEqual(['list', 'run']);
  });
});

describe('generateCompletion', () => {
  const program = buildProgram();

  it('bash script registers the completion + lists commands and group children', () => {
    const out = generateCompletion(program, 'bash');
    expect(out).toContain('complete -F _midnite midnite');
    expect(out).toContain('list move workflow');
    expect(out).toContain('workflow) COMPREPLY='); // group → children case
    expect(out).toContain('--json');
  });

  it('zsh script has the #compdef header and compdef registration', () => {
    const out = generateCompletion(program, 'zsh');
    expect(out.startsWith('#compdef midnite')).toBe(true);
    expect(out).toContain('compdef _midnite midnite');
    expect(out).toContain("'list:List tasks'");
  });

  it('fish script emits per-command complete lines + subcommand conditions', () => {
    const out = generateCompletion(program, 'fish');
    expect(out).toContain('complete -c midnite -n __fish_use_subcommand -a list');
    expect(out).toContain("complete -c midnite -n '__fish_seen_subcommand_from workflow' -a run");
    expect(out).toContain('complete -c midnite -l json');
  });
});
