import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MidniteConfig } from '@midnite/shared';
import * as schema from '../db/schema';
import { BrainstormsRepository } from './brainstorms.repository';
import { BrainstormRunnerService } from './brainstorm-runner.service';

// A managed-run spawn the runner can drive: capture the attach ids spawned and,
// on the next microtask, feed canned output + an exit code. Contributor and
// synthesis terminals are distinguished by the deterministic '-synth' suffix.
class FakeTerminal {
  spawns: string[] = [];
  contributor: { data: string | null; exit: number } = { data: '- Idea: ship it', exit: 0 };
  synth: { data: string | null; exit: number } = { data: '## Synthesis\n\nGo.', exit: 0 };

  spawnManagedRun(
    attachId: string,
    _spec: { command: string; args: string[]; cwd: string },
    hooks: { onData: (c: string) => void; onExit: (code: number, signal: number | null) => void },
  ): { ok: true; pid: number } | { ok: false; error: string } {
    this.spawns.push(attachId);
    const res = attachId.endsWith('-synth') ? this.synth : this.contributor;
    queueMicrotask(() => {
      if (res.data) hooks.onData(res.data);
      hooks.onExit(res.exit, null);
    });
    return { ok: true, pid: 1 };
  }

  killManagedRun(): void {}
  has(): boolean {
    return false;
  }

  contributorSpawns(): string[] {
    return this.spawns.filter((id) => !id.endsWith('-synth'));
  }
  synthSpawns(): string[] {
    return this.spawns.filter((id) => id.endsWith('-synth'));
  }
}

const config = { brainstorms: { runTimeoutMs: 600_000 } } as unknown as MidniteConfig;
const now = '2026-06-19T00:00:00.000Z';

function makeRepo(): BrainstormsRepository {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return new BrainstormsRepository(db);
}

/** Seed a brainstorm with `n` contributors and return its id. */
function seed(repo: BrainstormsRepository, n: number): string {
  const b = repo.insertBrainstorm({
    id: `b-${n}`,
    name: 'Growth',
    description: null,
    synthProvider: 'gemini',
    defaultMode: 'shortlist',
    createdAt: now,
    updatedAt: now,
  });
  for (let i = 0; i < n; i++) {
    repo.insertContributor({
      id: `c-${i}`,
      brainstormId: b.id,
      name: `Lens ${i}`,
      provider: 'claude',
      lens: `lens ${i}`,
      position: i,
      createdAt: now,
      updatedAt: now,
    });
  }
  return b.id;
}

async function waitFor(pred: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for run state');
    await new Promise((r) => setTimeout(r, 5));
  }
}

let repo: BrainstormsRepository;
let terminal: FakeTerminal;
let runner: BrainstormRunnerService;

beforeEach(() => {
  repo = makeRepo();
  terminal = new FakeTerminal();
  runner = new BrainstormRunnerService(config, repo, terminal as never);
});

describe('BrainstormRunnerService', () => {
  it('synthesizes a run with a single contributor', async () => {
    const id = seed(repo, 1);
    const run = runner.startRun(id, 'Where should we grow?');
    expect(run.status).toBe('running');

    await waitFor(() => repo.getRun(run.id)!.status === 'completed');
    const done = repo.hydrateRun(repo.getRun(run.id)!);
    expect(done.synthesis).toContain('Synthesis');
    expect(done.contributors[0]!.status).toBe('succeeded');
    expect(done.contributors[0]!.output).toContain('ship it');
    expect(terminal.contributorSpawns()).toHaveLength(1);
    expect(terminal.synthSpawns()).toHaveLength(1);
  });

  it('fails the run when no contributor produces ideas (and never synthesizes)', async () => {
    const id = seed(repo, 1);
    terminal.contributor = { data: null, exit: 1 };
    const run = runner.startRun(id, 'topic');

    await waitFor(() => repo.getRun(run.id)!.status === 'failed');
    const failed = repo.getRun(run.id)!;
    expect(failed.error).toContain('no contributor produced ideas');
    expect(terminal.synthSpawns()).toHaveLength(0);
  });

  it('re-synthesizes in a new mode, reusing captured ideas without re-running contributors', async () => {
    const id = seed(repo, 1);
    const run = runner.startRun(id, 'topic');
    await waitFor(() => repo.getRun(run.id)!.status === 'completed');

    const contributorSpawnsAfterRun = terminal.contributorSpawns().length;
    terminal.synth = { data: '## Gap analysis\n\nNobody covered pricing.', exit: 0 };

    const resumed = runner.retrySynthesis(id, run.id, 'gaps');
    expect(resumed.status).toBe('synthesizing');

    await waitFor(() => repo.getRun(run.id)!.status === 'completed');
    const done = repo.hydrateRun(repo.getRun(run.id)!);
    expect(done.mode).toBe('gaps');
    expect(done.synthesis).toContain('Gap analysis');
    // Contributors were NOT respawned — only a second synthesis ran.
    expect(terminal.contributorSpawns()).toHaveLength(contributorSpawnsAfterRun);
    expect(terminal.synthSpawns()).toHaveLength(2);
    expect(done.contributors[0]!.status).toBe('succeeded');
  });
});
