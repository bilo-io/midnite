import { describe, expect, it } from 'vitest';
import { parseConfig } from '@midnite/shared';
import type { TerminalService } from '../terminal/terminal.service';
import {
  CouncilParticipantNotLiveError,
  CouncilRunInProgressError,
  CouncilRunNotRetryableError,
  CouncilRunnerService,
  CouncilTooSmallError,
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

/** Drive the verdict CLI spawned after all participants settle. */
async function settleVerdict(
  terminal: FakeTerminal,
  runId: string,
  opts?: { output?: string; exitCode?: number },
): Promise<void> {
  const id = `council-${runId}-verdict`;
  await waitUntil(() => terminal.spawns.has(id));
  const spawn = terminal.spawns.get(id)!;
  if (opts?.output !== undefined) spawn.onData(opts.output);
  spawn.onExit(opts?.exitCode ?? 0, null);
}

function seedCouncil(
  repo: InMemoryCouncilsRepo,
  participants: Array<{ id: string; name: string; provider: string; perspective: string }>,
): string {
  const now = new Date().toISOString();
  repo.insertCouncil({ id: 'c1', name: 'council', createdAt: now, updatedAt: now });
  for (const p of participants) {
    repo.insertParticipant({ ...p, councilId: 'c1', createdAt: now, updatedAt: now });
  }
  return 'c1';
}

const TWO_PARTICIPANTS = [
  { id: 'p1', name: 'Optimist', provider: 'claude', perspective: 'argue for' },
  { id: 'p2', name: 'Skeptic', provider: 'gemini', perspective: 'argue against' },
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
  it('rejects a run with fewer than 2 participants', () => {
    const { runner, repo } = makeRunner();
    seedCouncil(repo, [TWO_PARTICIPANTS[0]!]);
    expect(() => runner.startRun('c1', 'topic')).toThrow(CouncilTooSmallError);
  });

  it('rejects a concurrent run on the same council', () => {
    const { runner, repo } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    runner.startRun('c1', 'topic');
    expect(() => runner.startRun('c1', 'another topic')).toThrow(CouncilRunInProgressError);
  });

  it('spawns one PTY per participant with the perspective-framed prompt', () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    const run = runner.startRun('c1', 'Should we rewrite in Rust?');

    expect(run.status).toBe('running');
    expect(run.participants).toHaveLength(2);
    expect(terminal.spawns.size).toBe(2);

    const [t1, t2] = run.participants.map((p) => p.terminalId);
    expect(t1).toMatch(new RegExp(`^council-${run.id}-p1$`));
    const spawn1 = terminal.spawns.get(t1!)!;
    expect(spawn1.command).toBe('claude');
    expect(spawn1.args[0]).toBe('-p');
    expect(spawn1.args[1]).toContain('argue for');
    expect(spawn1.args[1]).toContain('Should we rewrite in Rust?');
    expect(terminal.spawns.get(t2!)!.command).toBe('gemini');
  });

  it('completes the full flow: capture → clean → anonymize → verdict', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    const run = runner.startRun('c1', 'Rust?');
    expect(run.verdictProvider).toBe('gemini'); // council default judge

    const [a, b] = run.participants;
    terminal.spawns.get(a!.terminalId)!.onData('\x1b[1mYes:\x1b[0m do it\r\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onData('No: churn risk\r\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);

    // The verdict runs as a one-shot CLI under the deterministic attach id,
    // with the anonymized prompt as its argv — no names, no providers.
    const verdictId = `council-${run.id}-verdict`;
    await waitUntil(() => terminal.spawns.has(verdictId));
    const verdictSpawn = terminal.spawns.get(verdictId)!;
    expect(verdictSpawn.command).toBe('gemini');
    const verdictPrompt = verdictSpawn.args.join(' ');
    expect(verdictPrompt).not.toMatch(/Optimist|Skeptic/);
    expect(verdictPrompt).toContain('## Participant A');
    verdictSpawn.onData('## Verdict\r\n\r\nParticipant A wins.\r\n');
    verdictSpawn.onExit(0, null);

    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const done = repo.getRun(run.id)!;
    expect(done.verdict).toContain('Participant A wins.');

    const rows = repo.listRunParticipants(run.id);
    expect(rows.map((r) => r.status)).toEqual(['succeeded', 'succeeded']);
    // Output cleaned of ANSI noise.
    expect(rows.find((r) => r.participantId === 'p1')!.output).toBe('Yes: do it');

    // Both labeled, mapping persisted.
    const labels = rows.map((r) => r.label).sort();
    expect(labels).toEqual(['A', 'B']);
    const labelMap = JSON.parse(done.labelMap!) as Record<string, string>;
    expect(Object.keys(labelMap).sort()).toEqual(['A', 'B']);
    expect(new Set(Object.values(labelMap))).toEqual(new Set(rows.map((r) => r.id)));
  });

  it('fails the run when fewer than 2 participants produce output', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    const run = runner.startRun('c1', 'topic');

    const [a, b] = run.participants;
    terminal.spawns.get(a!.terminalId)!.onData('only take\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onExit(2, null); // no output, nonzero exit

    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');
    expect(repo.getRun(run.id)!.error).toContain('at least 2');
    expect(terminal.spawns.has(`council-${run.id}-verdict`)).toBe(false);

    const rows = repo.listRunParticipants(run.id);
    expect(rows.find((r) => r.participantId === 'p2')!.status).toBe('failed');
    // The council frees up for another run after a failure.
    expect(() => runner.startRun('c1', 'retry')).not.toThrow();
  });

  it('marks a participant timed-out, keeps partial output, and still synthesizes', async () => {
    const { runner, repo, terminal } = makeRunner({ runTimeoutMs: 30 });
    seedCouncil(repo, [
      ...TWO_PARTICIPANTS,
      { id: 'p3', name: 'Slow', provider: 'codex', perspective: 'ponder' },
    ]);
    const run = runner.startRun('c1', 'topic');

    const [a, b, c] = run.participants;
    terminal.spawns.get(a!.terminalId)!.onData('take a\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onData('take b\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);
    terminal.spawns.get(c!.terminalId)!.onData('partial think');
    // p3 never exits on its own — the 30ms timeout kills it (FakeTerminal
    // delivers onExit(-1) from killManagedRun, like a SIGTERM reap).

    await settleVerdict(terminal, run.id, { output: 'verdict md' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const slow = repo
      .listRunParticipants(run.id)
      .find((r) => r.participantId === 'p3')!;
    expect(slow.status).toBe('timeout');
    expect(slow.output).toBe('partial think');
    expect(slow.error).toContain('timed out');
  });

  it('marks a participant failed when its spawn fails, without killing the run', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, [
      ...TWO_PARTICIPANTS,
      { id: 'p3', name: 'Broken', provider: 'aider', perspective: 'x' },
    ]);
    terminal.failNextSpawn = true; // p1's spawn fails
    const run = runner.startRun('c1', 'topic');

    const rows = repo.listRunParticipants(run.id);
    expect(rows.find((r) => r.participantId === 'p1')!.status).toBe('failed');

    const [, b, c] = run.participants;
    terminal.spawns.get(b!.terminalId)!.onData('take b\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);
    terminal.spawns.get(c!.terminalId)!.onData('take c\n');
    terminal.spawns.get(c!.terminalId)!.onExit(0, null);

    await settleVerdict(terminal, run.id, { output: 'verdict md' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
  });

  it('fails the run but keeps outputs and labels when the verdict CLI errors', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    const run = runner.startRun('c1', 'topic');

    for (const p of run.participants) {
      terminal.spawns.get(p.terminalId)!.onData('take\n');
      terminal.spawns.get(p.terminalId)!.onExit(0, null);
    }
    await settleVerdict(terminal, run.id, {
      output: 'ERROR: Please set GEMINI_API_KEY\n',
      exitCode: 1,
    });

    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');
    const done = repo.getRun(run.id)!;
    // The output tail rides in the error so auth problems are visible at a glance.
    expect(done.error).toContain('verdict (gemini) exited with code 1');
    expect(done.error).toContain('GEMINI_API_KEY');
    expect(done.labelMap).toBeTruthy(); // labels persisted before the verdict ran
    expect(repo.listRunParticipants(run.id).every((r) => r.output === 'take')).toBe(true);
    // The council frees up for another run after a failed verdict.
    expect(() => runner.startRun('c1', 'retry')).not.toThrow();
  });

  it('fails the run when the verdict CLI cannot spawn', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    const run = runner.startRun('c1', 'topic');

    const [a, b] = run.participants;
    terminal.spawns.get(a!.terminalId)!.onData('take\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.failNextSpawn = true; // the next spawn is the verdict CLI
    terminal.spawns.get(b!.terminalId)!.onData('take\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);

    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');
    expect(repo.getRun(run.id)!.error).toContain('verdict (gemini) failed to start');
  });

  it('skips a hung participant and synthesizes once the rest finish', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, [
      ...TWO_PARTICIPANTS,
      { id: 'p3', name: 'Hung', provider: 'codex', perspective: 'never answers' },
    ]);
    const run = runner.startRun('c1', 'topic');
    const [a, b, c] = run.participants;

    terminal.spawns.get(a!.terminalId)!.onData('take a\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onData('take b\n');
    terminal.spawns.get(b!.terminalId)!.onExit(0, null);

    // p3 printed an error and hangs (e.g. missing API key) — skip it.
    terminal.spawns.get(c!.terminalId)!.onData('ERROR: Missing OPENAI_API_KEY\n');
    const updated = runner.skipParticipant('c1', run.id, c!.id);
    expect(updated.participants.find((p) => p.id === c!.id)!.status).toBe('skipped');

    await settleVerdict(terminal, run.id, { output: 'verdict md' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const skipped = repo.listRunParticipants(run.id).find((r) => r.participantId === 'p3')!;
    expect(skipped.status).toBe('skipped');
    expect(skipped.error).toBe('skipped by user');
    // Partial output is kept for the record.
    expect(skipped.output).toContain('Missing OPENAI_API_KEY');
  });

  it('rejects skipping a participant that already settled or an unknown run', () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    const run = runner.startRun('c1', 'topic');
    const [a] = run.participants;
    terminal.spawns.get(a!.terminalId)!.onExit(0, null); // settles as failed (no output)

    expect(() => runner.skipParticipant('c1', run.id, a!.id)).toThrow(
      CouncilParticipantNotLiveError,
    );
    expect(() => runner.skipParticipant('c1', 'nope', a!.id)).toThrow(/does not exist/);
  });

  it('retries a failed participant and re-synthesizes from the snapshot', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    const run = runner.startRun('c1', 'topic');

    const [a, b] = run.participants;
    terminal.spawns.get(a!.terminalId)!.onData('take a\n');
    terminal.spawns.get(a!.terminalId)!.onExit(0, null);
    terminal.spawns.get(b!.terminalId)!.onExit(1, null); // b fails, no output

    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');

    // Rerun only b: same terminal id, same perspective-framed prompt.
    terminal.spawns.delete(b!.terminalId);
    const retried = runner.retryParticipant('c1', run.id, b!.id);
    expect(retried.status).toBe('running');
    expect(retried.participants.find((p) => p.id === b!.id)!.status).toBe('running');

    const respawn = terminal.spawns.get(b!.terminalId)!;
    expect(respawn.command).toBe('gemini');
    expect(respawn.args.join(' ')).toContain('argue against');
    respawn.onData('take b, this time it works\n');
    respawn.onExit(0, null);

    await settleVerdict(terminal, run.id, { output: 'verdict md' });
    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const rows = repo.listRunParticipants(run.id);
    expect(rows.map((r) => r.status)).toEqual(['succeeded', 'succeeded']);
    expect(rows.map((r) => r.label).sort()).toEqual(['A', 'B']);
  });

  it('retries the verdict with the council\'s current provider', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    const run = runner.startRun('c1', 'topic');

    for (const p of run.participants) {
      terminal.spawns.get(p.terminalId)!.onData('take\n');
      terminal.spawns.get(p.terminalId)!.onExit(0, null);
    }
    await settleVerdict(terminal, run.id, { output: 'rate limited!\n', exitCode: 1 });
    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');

    // Switch the judge, then retry from persisted outputs — no participant reruns.
    repo.updateCouncil('c1', { verdictProvider: 'opencode' });
    terminal.spawns.delete(`council-${run.id}-verdict`);
    const retried = runner.retryVerdict('c1', run.id);
    expect(retried.status).toBe('synthesizing');
    expect(retried.verdictProvider).toBe('opencode');

    const verdictSpawn = terminal.spawns.get(`council-${run.id}-verdict`)!;
    expect(verdictSpawn.command).toBe('opencode');
    verdictSpawn.onData('## Verdict via opencode\n');
    verdictSpawn.onExit(0, null);

    await waitUntil(() => repo.getRun(run.id)!.status === 'completed');
    const done = repo.getRun(run.id)!;
    expect(done.verdict).toContain('Verdict via opencode');
    expect(done.error).toBeNull(); // stale failure cleared
  });

  it('rejects retries while the run is live or for running participants', async () => {
    const { runner, repo, terminal } = makeRunner();
    seedCouncil(repo, TWO_PARTICIPANTS);
    const run = runner.startRun('c1', 'topic');
    const [a] = run.participants;

    // Live run: nothing is retryable yet.
    expect(() => runner.retryVerdict('c1', run.id)).toThrow(CouncilRunInProgressError);
    expect(() => runner.retryParticipant('c1', run.id, a!.id)).toThrow(CouncilRunInProgressError);

    for (const p of run.participants) {
      terminal.spawns.get(p.terminalId)!.onExit(1, null);
    }
    await waitUntil(() => repo.getRun(run.id)!.status === 'failed');
    expect(() => runner.retryParticipant('c1', run.id, 'nope')).toThrow(
      CouncilRunNotRetryableError,
    );
  });

  it('marks stale live runs failed on module init (gateway restart)', () => {
    const { runner, repo } = makeRunner();
    const now = new Date().toISOString();
    repo.insertRun({ id: 'r1', councilId: 'c1', topic: 't', status: 'running', startedAt: now });
    repo.insertRunParticipant({
      id: 'rp1',
      runId: 'r1',
      participantId: 'p1',
      name: '',
      provider: 'claude',
      perspective: '',
      status: 'running',
      terminalId: 'council-r1-p1',
      startedAt: now,
    });

    runner.onModuleInit();
    expect(repo.getRun('r1')!.status).toBe('failed');
    expect(repo.getRun('r1')!.error).toContain('restarted');
    expect(repo.listRunParticipants('r1')[0]!.status).toBe('failed');
  });
});
