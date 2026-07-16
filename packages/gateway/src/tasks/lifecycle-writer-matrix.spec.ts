import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  STATUSES,
  parseConfig,
  type Status,
} from '@midnite/shared';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import type { PlannerService } from '../agent/planner.service';
import type { ReposService } from '../repos/repos.service';
import { createTestDb, type TestDbHandle } from '../test/db';
import { TasksRepository } from './tasks.repository';
import { TaskFailuresRepository } from './task-failures.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';

/**
 * Phase 69 Theme A — the signal→edge audit's executable half. This pins the
 * writer matrix documented in `docs/LIFECYCLE.md`: for every `TasksService`
 * writer, which edge it drives + which guard it enforces, plus a programmatic
 * cross-check that **every** legal edge in `ALLOWED_TRANSITIONS` is accounted for
 * (has a driver or is explicitly `deliberately-dead`), and the race-convergence
 * pins for the hazards the audit verified safe. If the doc table and the code
 * ever drift, this spec fails.
 */

class StubClassifier extends TaskClassifier {
  async classify(prompt: string, _images: ClassifierImage[]) {
    return { title: prompt.slice(0, 40), kind: 'feature' as const };
  }
}
const stubPlanner = {
  triage: async () => ({ ready: true }),
  answer: async () => null,
  guessRepo: async () => null,
} as unknown as PlannerService;
const stubRepos = { findByName: () => undefined, list: () => [] } as unknown as ReposService;

// Debounce OFF so `markWaiting` flips synchronously — the matrix asserts edges,
// not the Phase 69 B timing behaviour (that has its own spec).
const config = parseConfig({ agent: { resumeDebounceMs: 0 }, terminal: {}, gateway: {} });

describe('lifecycle writer matrix (Phase 69 Theme A)', () => {
  let handle: TestDbHandle;
  let repo: TasksRepository;
  let service: TasksService;

  beforeEach(() => {
    handle = createTestDb();
    repo = new TasksRepository(handle.db);
    service = new TasksService(
      repo,
      new TaskFailuresRepository(handle.db),
      new StubClassifier(),
      stubPlanner,
      new TaskEventBus(),
      stubRepos,
      config,
    );
  });

  afterEach(() => handle.close());

  /** Create a task and drive it to `status` through legal edges only. */
  const seed = async (status: Status): Promise<string> => {
    const t = await service.createFromPrompt({ prompt: 'do the thing', images: [] });
    switch (status) {
      case 'todo':
        return t.id;
      case 'backlog':
        service.updateStatus(t.id, 'backlog');
        return t.id;
      case 'wip':
        service.startTask(t.id);
        return t.id;
      case 'waiting':
        service.startTask(t.id);
        service.markWaiting(t.id); // needs-input
        return t.id;
      case 'done':
        service.startTask(t.id);
        service.markDone(t.id);
        return t.id;
      case 'abandoned':
        service.updateStatus(t.id, 'abandoned');
        return t.id;
    }
  };

  const kinds = (id: string) => repo.getTask(id)!; // raw row for waitReason etc.

  // --- Writer → edge matrix ---------------------------------------------------

  type Case = {
    name: string;
    from: Status;
    run: (id: string) => void;
    to: Status;
    /** "from->to" edges this writer exercises; fed into the cross-check set. */
    edges: string[];
  };

  const CASES: Case[] = [
    {
      name: 'startTask: todo → wip (scheduler claim)',
      from: 'todo',
      run: (id) => service.startTask(id),
      to: 'wip',
      edges: ['todo->wip'],
    },
    {
      name: 'startTask: backlog → wip (manual start)',
      from: 'backlog',
      run: (id) => service.startTask(id),
      to: 'wip',
      edges: ['backlog->wip'],
    },
    {
      name: 'requeue: wip → todo',
      from: 'wip',
      run: (id) => service.requeue(id),
      to: 'todo',
      edges: ['wip->todo'],
    },
    {
      name: 'requeue(backlog): wip → backlog',
      from: 'wip',
      run: (id) => service.requeue(id, 'backlog'),
      to: 'backlog',
      edges: ['wip->backlog'],
    },
    {
      name: 'requeue: waiting → todo',
      from: 'waiting',
      run: (id) => service.requeue(id),
      to: 'todo',
      edges: ['waiting->todo'],
    },
    {
      name: 'retry: wip → todo',
      from: 'wip',
      run: (id) => service.retry(id),
      to: 'todo',
      edges: ['wip->todo'],
    },
    {
      name: 'markWaiting: wip → waiting',
      from: 'wip',
      run: (id) => service.markWaiting(id),
      to: 'waiting',
      edges: ['wip->waiting'],
    },
    {
      name: 'escalate: wip → waiting (needs-attention)',
      from: 'wip',
      run: (id) => service.escalate(id, 'agent-failed'),
      to: 'waiting',
      edges: ['wip->waiting'],
    },
    {
      name: 'markDone: wip → done',
      from: 'wip',
      run: (id) => service.markDone(id),
      to: 'done',
      edges: ['wip->done'],
    },
    {
      name: 'markDone: waiting → done',
      from: 'waiting',
      run: (id) => service.markDone(id),
      to: 'done',
      edges: ['waiting->done'],
    },
    {
      name: 'resumeFromWaiting: waiting → wip',
      from: 'waiting',
      run: (id) => service.resumeFromWaiting(id),
      to: 'wip',
      edges: ['waiting->wip'],
    },
    {
      name: 'resolveNeedsAttention(requeue): waiting → todo',
      from: 'waiting',
      run: (id) => service.resolveNeedsAttention(id, 'requeue'),
      to: 'todo',
      edges: ['waiting->todo'],
    },
    {
      name: 'resolveNeedsAttention(abandon): waiting → abandoned',
      from: 'waiting',
      run: (id) => service.resolveNeedsAttention(id, 'abandon'),
      to: 'abandoned',
      edges: ['waiting->abandoned'],
    },
    {
      name: 'updateStatus: backlog → todo',
      from: 'backlog',
      run: (id) => service.updateStatus(id, 'todo'),
      to: 'todo',
      edges: ['backlog->todo'],
    },
    {
      name: 'updateStatus: backlog → abandoned',
      from: 'backlog',
      run: (id) => service.updateStatus(id, 'abandoned'),
      to: 'abandoned',
      edges: ['backlog->abandoned'],
    },
    {
      name: 'updateStatus: todo → backlog',
      from: 'todo',
      run: (id) => service.updateStatus(id, 'backlog'),
      to: 'backlog',
      edges: ['todo->backlog'],
    },
    {
      name: 'updateStatus: todo → waiting',
      from: 'todo',
      run: (id) => service.updateStatus(id, 'waiting'),
      to: 'waiting',
      edges: ['todo->waiting'],
    },
    {
      name: 'updateStatus: todo → done',
      from: 'todo',
      run: (id) => service.updateStatus(id, 'done'),
      to: 'done',
      edges: ['todo->done'],
    },
    {
      name: 'updateStatus: todo → abandoned',
      from: 'todo',
      run: (id) => service.updateStatus(id, 'abandoned'),
      to: 'abandoned',
      edges: ['todo->abandoned'],
    },
    {
      name: 'updateStatus: wip → abandoned (cancel path)',
      from: 'wip',
      run: (id) => service.updateStatus(id, 'abandoned'),
      to: 'abandoned',
      edges: ['wip->abandoned'],
    },
    {
      name: 'updateStatus: waiting → backlog',
      from: 'waiting',
      run: (id) => service.updateStatus(id, 'backlog'),
      to: 'backlog',
      edges: ['waiting->backlog'],
    },
    {
      name: 'updateStatus: waiting → abandoned',
      from: 'waiting',
      run: (id) => service.updateStatus(id, 'abandoned'),
      to: 'abandoned',
      edges: ['waiting->abandoned'],
    },
    {
      name: 'updateStatus: backlog → wip (manual)',
      from: 'backlog',
      run: (id) => service.updateStatus(id, 'wip'),
      to: 'wip',
      edges: ['backlog->wip'],
    },
  ];

  const drivenEdges = new Set<string>();

  for (const c of CASES) {
    it(c.name, async () => {
      const id = await seed(c.from);
      expect(repo.getTask(id)!.status).toBe(c.from);
      c.run(id);
      expect(repo.getTask(id)!.status).toBe(c.to);
    });
    for (const e of c.edges) drivenEdges.add(e);
  }

  // --- Guards -----------------------------------------------------------------

  describe('guards', () => {
    it('updateStatus rejects an illegal edge (canTransition)', async () => {
      const id = await seed('done');
      expect(() => service.updateStatus(id, 'wip')).toThrow();
      expect(() => service.updateStatus(id, 'todo')).toThrow();
      expect(repo.getTask(id)!.status).toBe('done');
    });

    it('markWaiting / markDone / escalate are terminal-guarded (no revival)', async () => {
      const done = await seed('done');
      expect(service.markWaiting(done).status).toBe('done');
      expect(service.escalate(done, 'agent-failed').status).toBe('done');
      const abandoned = await seed('abandoned');
      expect(service.markDone(abandoned).status).toBe('abandoned');
    });

    it('markWaiting is idempotent on (status, reason) — one event', async () => {
      const id = await seed('wip');
      service.markWaiting(id);
      service.markWaiting(id);
      expect(repo.getTask(id)!.status).toBe('waiting');
      expect(repo.listEvents(id).filter((e) => e.kind === 'agent.waiting')).toHaveLength(1);
    });

    it('markDone is idempotent and never un-abandons', async () => {
      const id = await seed('wip');
      service.markDone(id);
      expect(service.markDone(id).status).toBe('done');
      const cancelled = await seed('abandoned');
      expect(service.markDone(cancelled, 'https://x/pr/1').status).toBe('abandoned');
    });

    it('resumeFromWaiting resumes only a live needs-input wait', async () => {
      // needs-input → resumes
      const live = await seed('waiting');
      expect(kinds(live).waitReason).toBe('needs-input');
      expect(service.resumeFromWaiting(live).status).toBe('wip');

      // needs-attention (escalated, dead session) → stays waiting
      const dead = await seed('wip');
      service.escalate(dead, 'agent-failed');
      expect(service.resumeFromWaiting(dead).status).toBe('waiting');
      expect(kinds(dead).waitReason).toBe('agent-failed');

      // terminal → untouched
      const done = await seed('done');
      expect(service.resumeFromWaiting(done).status).toBe('done');
    });
  });

  // --- Dead-edge cross-check (matrix ↔ ALLOWED_TRANSITIONS) --------------------

  describe('dead-edge accounting', () => {
    // Edges that are legal but deliberately have no automated/manual driver.
    // Currently empty — every legal edge is driven (see docs/LIFECYCLE.md §3).
    const DELIBERATELY_DEAD = new Set<string>();

    it('every legal edge in ALLOWED_TRANSITIONS is driven or deliberately dead', () => {
      const unaccounted: string[] = [];
      for (const from of STATUSES) {
        for (const to of ALLOWED_TRANSITIONS[from]) {
          const key = `${from}->${to}`;
          if (!drivenEdges.has(key) && !DELIBERATELY_DEAD.has(key)) unaccounted.push(key);
        }
      }
      expect(unaccounted).toEqual([]);
    });

    it('no driven edge is illegal under ALLOWED_TRANSITIONS', () => {
      const illegal: string[] = [];
      for (const key of drivenEdges) {
        const [from, to] = key.split('->') as [Status, Status];
        if (!ALLOWED_TRANSITIONS[from].includes(to)) illegal.push(key);
      }
      expect(illegal).toEqual([]);
    });

    it('terminal states have no outgoing edges', () => {
      expect(ALLOWED_TRANSITIONS.done).toEqual([]);
      expect(ALLOWED_TRANSITIONS.abandoned).toEqual([]);
    });
  });

  // --- Race convergence pins (docs/LIFECYCLE.md §4) ----------------------------

  describe('race convergence', () => {
    it('Stop-vs-Notification: two markWaiting calls converge to one waiting', async () => {
      const id = await seed('wip');
      service.markWaiting(id); // Stop, no PR
      service.markWaiting(id); // Notification
      expect(repo.getTask(id)!.status).toBe('waiting');
      expect(repo.listEvents(id).filter((e) => e.kind === 'agent.waiting')).toHaveLength(1);
    });

    it('late hook after terminal: markWaiting after markDone no-ops (onExit guard)', async () => {
      const id = await seed('wip');
      service.markDone(id);
      // The would-be onExit re-process / trailing Notification:
      expect(service.markWaiting(id).status).toBe('done');
      expect(repo.getTask(id)!.status).toBe('done');
    });

    it('resume ↔ Stop ping-pong converges (debounce off)', async () => {
      const id = await seed('waiting'); // needs-input
      service.resumeFromWaiting(id); // → wip
      expect(repo.getTask(id)!.status).toBe('wip');
      service.markWaiting(id); // Stop at end of the resumed turn → waiting
      expect(repo.getTask(id)!.status).toBe('waiting');
      // and it settles — no runaway: a second resume+stop lands in the same place
      service.resumeFromWaiting(id);
      service.markWaiting(id);
      expect(repo.getTask(id)!.status).toBe('waiting');
    });
  });
});
