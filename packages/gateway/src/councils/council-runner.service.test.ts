import { describe, expect, it } from 'vitest';
import { parseConfig, type CouncilFormat } from '@midnite/shared';
import type { TerminalService } from '../terminal/terminal.service';
import {
  CouncilEmptyError,
  CouncilMemberNotLiveError,
  CouncilRunInProgressError,
  CouncilRunNotRetryableError,
  CouncilRunnerService,
} from './council-runner.service';
import { InMemoryCouncilsRepo } from './test-fixtures';

/**
 * Fake TerminalService: records each spawn's hooks so tests drive output and
 * exit by hand. killManagedRun delivers onExit(-1) like a real SIGTERM reap.
 */
class FakeTerminal {
  spawns = new Map<
    string,
    {
      command: string;
      args: string[];
      onData: (chunk: string) => void;
      onExit: (exitCode: number, signal: number | null) => void;
    }
  >();
  failNextSpawn = false;

  spawnManagedRun(
    attachId: string,
    spec: { command: string; args: string[]; cwd: string },
    hooks: {
      onData: (chunk: string) => void;
      onExit: (exitCode: number, signal: number | null) => void;
    },
  ): { ok: true; pid: number } | { ok: false; error: string } {
    if (this.failNextSpawn) {
      this.failNextSpawn = false;
      return { ok: false, error: 'spawn failed (test)' };
    }
    this.spawns.set(attachId, { command: spec.command, args: spec.args, ...hooks });
    return { ok: true, pid: 1234 };
  }

  killManagedRun(attachId: string): void {
    this.spawns.get(attachId)?.onExit(-1, 15);
  }

  has(attachId: string): boolean {
    return this.spawns.has(attachId);
  }
}

function makeRunner(opts?: { runTimeoutMs?: number }): {
  runner: CouncilRunnerService;
  repo: InMemoryCouncilsRepo;
  terminal: FakeTerminal;
} {
  const config = parseConfig({
    agent: {},
    terminal: {},
    knowledge: {},
    gateway: {},
    councils: { runTimeoutMs: opts?.runTimeoutMs ?? 600000 },
  });
  const repo = new InMemoryCouncilsRepo();
  const terminal = new FakeTerminal();
  const runner = new CouncilRunnerService(config, repo, terminal as unknown as TerminalService);
  return { runner, repo, terminal };
}

/** Drive the synthesizer CLI spawned after all members settle. */
async function settleSynthesis(
  terminal: FakeTerminal,
  runId: string,
  opts?: { output?: string; exitCode?: number },
): Promise<void> {
  const id = `council-${runId}-synth`;
  await waitUntil(() => terminal.spawns.has(id));
  const spawn = terminal.spawns.get(id)!;
  if (opts?.output !== undefined) spawn.onData(opts.output);
  spawn.onExit(opts?.exitCode ?? 0, null);
}

function seedCouncil(
  repo: InMemoryCouncilsRepo,
  members: Array<{ id: string; name: string; provider: string; role: string }>,
  opts?: { defaultFormat?: CouncilFormat; customPrompt?: string },
): string {
  const now = new Date().toISOString();
  repo.insertCouncil({
    id: 'c1',
    name: 'council',
    synthProvider: 'gemini',
    defaultFormat: opts?.defaultFormat ?? 'brainstorm',
    customPrompt: opts?.customPrompt ?? null,
    createdAt: now,
    updatedAt: now,
  });
  members.forEach((m, i) => {
    repo.insertMember({ ...m, councilId: 'c1', position: i, createdAt: now, updatedAt: now });
  });
  return 'c1';
}

const TWO_MEMBERS = [
  { id: 'm1', name: 'Optimist', provider: 'claude', role: 'argue for' },
  { id: 'm2', name: 'Skeptic', provider: 'gemini', role: 'argue against' },
];

function waitUntil(pred: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      if (pred()) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(poll);
        reject(new Error('timeout waiting for condition'));
      }
    }, 5);
  });
}

describe('CouncilRunnerService', () => {
  it('rejects a run with no members', () => {
    const { runner, repo } = makeRunner();
    seedCouncil(repo, []);
    expect(() => runner.startRun('c1', 'topic')).toThrow(CouncilEmptyError);
  });

  it('rejects a concurrent run on the same council', () => {
    const { runner, repo } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS);
    runner.startRun('c1', 'topic');
    expect(() => runner.startRun('c1', 'another topic')).toThrow(CouncilRunInProgressError);
  });

  it('spawns one PTY per member with the role-framed prompt', () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS);
    const run = runner.startRun('c1', 'Should we rewrite in Rust?');

    expect(run.status).toBe('running');
    expect(run.format).toBe('brainstorm'); // council default
    expect(run.members).toHaveLength(2);
    expect(terminal.spawns.size).toBe(2);

    const [t1, t2] = run.members.map((m) => m.terminalId);
    expect(t1).toMatch(new RegExp(`^council-${run.id}-m1$`));
    const spawn1 = terminal.spawns.get(t1!)!;
    expect(spawn1.command).toBe('claude');
    expect(spawn1.args[0]).toBe('-p');
    expect(spawn1.args[1]).toContain('argue for');
    expect(spawn1.args[1]).toContain('Should we rewrite in Rust?');
    expect(terminal.spawns.get(t2!)!.command).toBe('gemini');
  });

  it('completes the brainstorm flow: capture → clean → attributed synthesis', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS);
    const run = runner.startRun('c1', 'Rust?');
    expect(run.synthProvider).toBe('gemini'); // council default synthesizer

    const [a, b] = run.members;
    terminal.spawns.get(a!.terminalId)!.onData('\x1b[1mYes:\x1b[0m do it\r\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onData('No: churn risk\r\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);

    // The synthesis runs as a one-shot CLI under the deterministic attach id. The
    // brainstorm format is attributed, so the prompt names the members.
    const synthId = `council-${run.id}-synth`;
    await waitUntil(() => terminal.spawns.has(synthId));
    const synthSpawn = terminal.spawns.get(synthId)!;
    expect(synthSpawn.command).toBe('gemini');
    const synthPrompt = synthSpawn.args.join(' ');
    expect(synthPrompt).toContain('## Optimist');
    expect(synthPrompt).toContain('## Skeptic');
    synthSpawn.onData('# Shortlist\r\n\r\nBest idea: do it.\r\n');
    synthSpawn.onExit(0, null);

    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const done = repo.getRun(run.id)!;
    expect(done.synthesis).toContain('Best idea: do it.');

    const rows = repo.listRunMembers(run.id);
    expect(rows.map((r) => r.status)).toEqual(['succeeded', 'succeeded']);
    expect(rows.find((r) => r.memberId === 'm1')!.output).toBe('Yes: do it'); // ANSI cleaned

    // Archived as a brainstorm synthesis: attributed, no label map.
    const syn = JSON.parse(done.syntheses!) as Array<{
      format: string;
      anonymized: boolean;
      labelMap?: unknown;
    }>;
    expect(syn).toHaveLength(1);
    expect(syn[0]!.format).toBe('brainstorm');
    expect(syn[0]!.anonymized).toBe(false);
    expect(syn[0]!.labelMap).toBeUndefined();
  });

  it('anonymizes the debate format: hides names, labels A/B, archives the map on the entry', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS, { defaultFormat: 'debate' });
    const run = runner.startRun('c1', 'Rust?');

    for (const m of run.members) {
      terminal.spawns.get(m.terminalId)!.onData('take\n');
      terminal.spawns.get(m.terminalId)!.onExit(0, null);
    }

    const synthId = `council-${run.id}-synth`;
    await waitUntil(() => terminal.spawns.has(synthId));
    const synthPrompt = terminal.spawns.get(synthId)!.args.join(' ');
    expect(synthPrompt).not.toMatch(/Optimist|Skeptic/);
    expect(synthPrompt).toContain('## Member A');
    terminal.spawns.get(synthId)!.onData('## Verdict\n\nMember A wins.\n');
    terminal.spawns.get(synthId)!.onExit(0, null);

    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const done = repo.getRun(run.id)!;
    const entry = (JSON.parse(done.syntheses!) as Array<{
      format: string;
      anonymized: boolean;
      labelMap: Record<string, string>;
    }>)[0]!;
    expect(entry.format).toBe('debate');
    expect(entry.anonymized).toBe(true);
    expect(Object.keys(entry.labelMap).sort()).toEqual(['A', 'B']);
    // The map points back at the actual run-member rows.
    const rows = repo.listRunMembers(run.id);
    expect(new Set(Object.values(entry.labelMap))).toEqual(new Set(rows.map((r) => r.id)));
    // Member rows are never themselves labeled — anonymization is synthesis-time only.
    expect(rows.every((r) => !('label' in (r as object)))).toBe(true);
  });

  it('re-synthesizes a finished run under a new format without re-running members', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS); // default brainstorm
    const run = runner.startRun('c1', 'Rust?');
    for (const m of run.members) {
      terminal.spawns.get(m.terminalId)!.onData('idea\n');
      terminal.spawns.get(m.terminalId)!.onExit(0, null);
    }
    await settleSynthesis(terminal, run.id, { output: '# Shortlist\n\nbest' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');

    // Re-synthesize as debate — only the synthesizer reruns; members stay settled.
    terminal.spawns.delete(`council-${run.id}-synth`);
    const retried = runner.retrySynthesis('c1', run.id, 'debate');
    expect(retried.status).toBe('synthesizing');
    expect(retried.members.every((m) => m.status === 'succeeded')).toBe(true);

    const synthSpawn = terminal.spawns.get(`council-${run.id}-synth`)!;
    expect(synthSpawn.args.join(' ')).toContain('## Member A');
    synthSpawn.onData('## Verdict\n\nA wins');
    synthSpawn.onExit(0, null);
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');

    const done = repo.getRun(run.id)!;
    expect(done.format).toBe('debate');
    expect(done.synthesis).toContain('A wins');
    // Both formats are now archived, side by side.
    const syn = JSON.parse(done.syntheses!) as Array<{ format: string }>;
    expect(syn.map((e) => e.format).sort()).toEqual(['brainstorm', 'debate']);
  });

  it('fails an anonymized format with <2 responses; re-synthesizing attributed uses the one', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS, { defaultFormat: 'debate' });
    const run = runner.startRun('c1', 'topic');

    const [a, b] = run.members;
    terminal.spawns.get(a!.terminalId)!.onData('only take\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onExit(2, null); // no output, nonzero exit

    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');
    expect(repo.getRun(run.id)!.error).toContain('at least 2');
    expect(terminal.spawns.has(`council-${run.id}-synth`)).toBe(false);

    // Brainstorm (attributed, min 1) succeeds over the single response.
    const retried = runner.retrySynthesis('c1', run.id, 'brainstorm');
    expect(retried.status).toBe('synthesizing');
    await settleSynthesis(terminal, run.id, { output: '# Shortlist' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    expect(repo.getRun(run.id)!.format).toBe('brainstorm');

    // The council frees up for another run after the earlier failure.
    expect(() => runner.startRun('c1', 'retry')).not.toThrow();
  });

  it('fails the custom format without a council prompt, then succeeds once one is set', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS, { defaultFormat: 'custom' }); // no customPrompt
    const run = runner.startRun('c1', 'topic');
    for (const m of run.members) {
      terminal.spawns.get(m.terminalId)!.onData('take\n');
      terminal.spawns.get(m.terminalId)!.onExit(0, null);
    }
    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');
    expect(repo.getRun(run.id)!.error).toContain('needs a synthesis prompt');
    expect(terminal.spawns.has(`council-${run.id}-synth`)).toBe(false);

    repo.updateCouncil('c1', { customPrompt: 'Write a haiku verdict.' });
    runner.retrySynthesis('c1', run.id, 'custom');
    const synthSpawn = terminal.spawns.get(`council-${run.id}-synth`)!;
    expect(synthSpawn.args.join(' ')).toContain('Write a haiku verdict.');
    synthSpawn.onData('haiku\n');
    synthSpawn.onExit(0, null);
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
  });

  it('marks a member timed-out, keeps partial output, and still synthesizes', async () => {
    const { runner, repo, terminal } = makeRunner({ runTimeoutMs: 30 });
    seedCouncil(repo, [
      ...TWO_MEMBERS,
      { id: 'm3', name: 'Slow', provider: 'codex', role: 'ponder' },
    ]);
    const run = runner.startRun('c1', 'topic');

    const [a, b, c] = run.members;
    terminal.spawns.get(a!.terminalId)!.onData('take a\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onData('take b\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);
    terminal.spawns.get(c!.terminalId)!.onData('partial think');
    // m3 never exits — the 30ms timeout kills it (FakeTerminal delivers onExit(-1)).

    await settleSynthesis(terminal, run.id, { output: '# md' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const slow = repo.listRunMembers(run.id).find((r) => r.memberId === 'm3')!;
    expect(slow.status).toBe('timeout');
    expect(slow.output).toBe('partial think');
    expect(slow.error).toContain('timed out');
  });

  it('marks a member failed when its spawn fails, without killing the run', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, [
      ...TWO_MEMBERS,
      { id: 'm3', name: 'Broken', provider: 'aider', role: 'x' },
    ]);
    terminal.failNextSpawn = true; // m1's spawn fails
    const run = runner.startRun('c1', 'topic');

    const rows = repo.listRunMembers(run.id);
    expect(rows.find((r) => r.memberId === 'm1')!.status).toBe('failed');

    const [, b, c] = run.members;
    terminal.spawns.get(b!.terminalId)!.onData('take b\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);
    terminal.spawns.get(c!.terminalId)!.onData('take c\n');
    terminal.spawns.get(c!.terminalId)!.onExit(0, null);

    await settleSynthesis(terminal, run.id, { output: '# md' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
  });

  it('fails the run but keeps member outputs when the synthesis CLI errors', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS);
    const run = runner.startRun('c1', 'topic');

    for (const m of run.members) {
      terminal.spawns.get(m.terminalId)!.onData('take\n');
      terminal.spawns.get(m.terminalId)!.onExit(0, null);
    }
    await settleSynthesis(terminal, run.id, {
      output: 'ERROR: Please set GEMINI_API_KEY\n',
      exitCode: 1,
    });

    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');
    const done = repo.getRun(run.id)!;
    // The output tail rides in the error so auth problems are visible at a glance.
    expect(done.error).toContain('synthesis (gemini) exited with code 1');
    expect(done.error).toContain('GEMINI_API_KEY');
    expect(repo.listRunMembers(run.id).every((r) => r.output === 'take')).toBe(true);
    // The council frees up for another run after a failed synthesis.
    expect(() => runner.startRun('c1', 'retry')).not.toThrow();
  });

  it('fails the run when the synthesis CLI cannot spawn', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS);
    const run = runner.startRun('c1', 'topic');

    const [a, b] = run.members;
    terminal.spawns.get(a!.terminalId)!.onData('take\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.failNextSpawn = true; // the next spawn is the synthesis CLI
    terminal.spawns.get(b!.terminalId)!.onData('take\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);

    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');
    expect(repo.getRun(run.id)!.error).toContain('synthesis (gemini) failed to start');
  });

  it('skips a hung member and synthesizes once the rest finish', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, [
      ...TWO_MEMBERS,
      { id: 'm3', name: 'Hung', provider: 'codex', role: 'never answers' },
    ]);
    const run = runner.startRun('c1', 'topic');
    const [a, b, c] = run.members;

    terminal.spawns.get(a!.terminalId)!.onData('take a\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onData('take b\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);

    terminal.spawns.get(c!.terminalId)!.onData('ERROR: Missing OPENAI_API_KEY\n');
    const updated = runner.skipMember('c1', run.id, c!.id);
    expect(updated.members.find((m) => m.id === c!.id)!.status).toBe('skipped');

    await settleSynthesis(terminal, run.id, { output: '# md' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const skipped = repo.listRunMembers(run.id).find((r) => r.memberId === 'm3')!;
    expect(skipped.status).toBe('skipped');
    expect(skipped.error).toBe('skipped by user');
    expect(skipped.output).toContain('Missing OPENAI_API_KEY'); // partial output kept
  });

  it('rejects skipping a member that already settled or an unknown run', () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS);
    const run = runner.startRun('c1', 'topic');
    const [a] = run.members;
    terminal.spawns.get(a!.terminalId)!.onExit(0, null); // settles as failed (no output)

    expect(() => runner.skipMember('c1', run.id, a!.id)).toThrow(CouncilMemberNotLiveError);
    expect(() => runner.skipMember('c1', 'nope', a!.id)).toThrow(/does not exist/);
  });

  it('retries a failed member with the edited live config and re-syncs its snapshot', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS);
    const run = runner.startRun('c1', 'topic');

    const [a, b] = run.members;
    terminal.spawns.get(a!.terminalId)!.onData('take a\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onExit(1, null); // b (gemini) fails, no output
    // brainstorm (min 1) synthesizes over the one response that succeeded.
    await settleSynthesis(terminal, run.id, { output: '# md' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');

    // Fix the failing member on the council, then retry: gemini → claude.
    repo.updateMember('m2', { provider: 'claude', role: 'argue carefully' });
    terminal.spawns.delete(b!.terminalId);
    terminal.spawns.delete(`council-${run.id}-synth`);
    const retried = runner.retryMember('c1', run.id, b!.id);
    expect(retried.status).toBe('running');

    const respawn = terminal.spawns.get(b!.terminalId)!;
    expect(respawn.command).toBe('claude');
    expect(respawn.args.join(' ')).toContain('argue carefully');

    const bRow = repo.listRunMembers(run.id).find((r) => r.memberId === 'm2')!;
    expect(bRow.provider).toBe('claude');
    expect(bRow.role).toBe('argue carefully');

    respawn.onData('better take\n');
    respawn.onExit(0, null);
    await settleSynthesis(terminal, run.id, { output: '# md' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    expect(repo.listRunMembers(run.id).map((r) => r.status)).toEqual(['succeeded', 'succeeded']);
  });

  it("re-synthesizes with the council's current synth provider (rate-limit escape)", async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS);
    const run = runner.startRun('c1', 'topic');

    for (const m of run.members) {
      terminal.spawns.get(m.terminalId)!.onData('take\n');
      terminal.spawns.get(m.terminalId)!.onExit(0, null);
    }
    await settleSynthesis(terminal, run.id, { output: 'rate limited!\n', exitCode: 1 });
    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');

    // Switch the synthesizer, then retry from persisted outputs — no member reruns.
    repo.updateCouncil('c1', { synthProvider: 'opencode' });
    terminal.spawns.delete(`council-${run.id}-synth`);
    const retried = runner.retrySynthesis('c1', run.id);
    expect(retried.status).toBe('synthesizing');
    expect(retried.synthProvider).toBe('opencode');

    const synthSpawn = terminal.spawns.get(`council-${run.id}-synth`)!;
    expect(synthSpawn.command).toBe('opencode');
    synthSpawn.onData('# Shortlist via opencode\n');
    synthSpawn.onExit(0, null);

    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const done = repo.getRun(run.id)!;
    expect(done.synthesis).toContain('via opencode');
    expect(done.error).toBeNull(); // stale failure cleared
  });

  it('rejects retries while the run is live or for unknown members', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_MEMBERS);
    const run = runner.startRun('c1', 'topic');
    const [a] = run.members;

    // Live run: nothing is retryable yet.
    expect(() => runner.retrySynthesis('c1', run.id)).toThrow(CouncilRunInProgressError);
    expect(() => runner.retryMember('c1', run.id, a!.id)).toThrow(CouncilRunInProgressError);

    for (const m of run.members) {
      terminal.spawns.get(m.terminalId)!.onExit(1, null);
    }
    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');
    expect(() => runner.retryMember('c1', run.id, 'nope')).toThrow(CouncilRunNotRetryableError);
  });

  it('marks stale live runs failed on module init (gateway restart)', () => {
    const { runner, repo } = makeRunner();
    const now = new Date().toISOString();
    repo.insertRun({
      id: 'r1',
      councilId: 'c1',
      prompt: 't',
      format: 'brainstorm',
      status: 'running',
      startedAt: now,
    });
    repo.insertRunMember({
      id: 'rm1',
      runId: 'r1',
      memberId: 'm1',
      name: '',
      provider: 'claude',
      role: '',
      status: 'running',
      terminalId: 'council-r1-m1',
      startedAt: now,
    });

    runner.onModuleInit();
    expect(repo.getRun('r1')!.status).toBe('failed');
    expect(repo.getRun('r1')!.error).toContain('restarted');
    expect(repo.listRunMembers('r1')[0]!.status).toBe('failed');
  });
});
