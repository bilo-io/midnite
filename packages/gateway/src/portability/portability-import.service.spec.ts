import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { ArchiveManifest, DomainPayload } from '@midnite/shared';
import { createTestDb, type TestDbHandle } from '../test/db';
import { PortabilityImportService } from './portability-import.service';
import { packArchive } from './lib/archive';

const NOW = '2026-07-05T10:00:00.000Z';

/** A representative multi-domain archive exercising JSON cols, booleans, nested
 *  children, cross-domain refs, workflow graph split, and archived state. */
function sampleDomains(): DomainPayload[] {
  return [
    {
      domain: 'projects',
      count: 1,
      records: [
        {
          id: 'p1',
          name: 'Proj',
          tag: 'PRJ',
          color: '#fff',
          createdAt: NOW,
          updatedAt: NOW,
          archived: false,
        },
      ],
    },
    {
      domain: 'tasks',
      count: 2,
      records: [
        {
          id: 't1',
          title: 'Task one',
          status: 'todo',
          priority: 2,
          projectId: 'p1',
          tags: ['a', 'b'],
          aiReview: { verdict: 'approve', summary: 's', runId: 'r', reviewedAt: NOW },
          createdAt: NOW,
          updatedAt: NOW,
          // derived fields the export embeds — must be dropped on import:
          prStatus: { state: 'open', url: 'u', number: 1, checks: 'passing', fetchedAt: NOW },
          checkRunStatus: 'passed',
          events: [{ id: 'e1', taskId: 't1', at: NOW, kind: 'created', data: { note: 'hi' } }],
          links: [{ id: 'l1', taskId: 't1', url: 'https://pr', kind: 'pr', createdAt: NOW }],
          dependsOn: ['t2'],
        },
        { id: 't2', title: 'Task two', status: 'done', priority: 1, createdAt: NOW, updatedAt: NOW, tags: [] },
      ],
    },
    { domain: 'notes', count: 1, records: [{ id: 'n1', content: 'a note', completed: true, position: 0, createdAt: NOW, updatedAt: NOW }] },
    {
      domain: 'routines',
      count: 1,
      records: [
        {
          id: 'ro1',
          name: 'Routine',
          createdAt: NOW,
          updatedAt: NOW,
          groups: [
            {
              id: 'g1',
              routineId: 'ro1',
              name: 'Group',
              position: 0,
              createdAt: NOW,
              updatedAt: NOW,
              items: [{ id: 'i1', groupId: 'g1', title: 'Item', position: 0, createdAt: NOW, updatedAt: NOW }],
            },
          ],
        },
      ],
    },
    {
      domain: 'approvalRules',
      count: 1,
      records: [{ id: 'ar1', enabled: true, effect: 'allow', toolName: 'Bash', match: { command: 'ls' }, scope: 'global', createdAt: NOW, updatedAt: NOW }],
    },
    {
      domain: 'workflows',
      count: 1,
      records: [
        {
          id: 'w1',
          name: 'WF',
          enabled: true,
          archived: false,
          trigger: { type: 'manual' },
          nodes: [{ id: 'node1', type: 'http' }],
          edges: [{ from: 'a', to: 'b' }],
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    },
  ];
}

function archive(domains: DomainPayload[], schemaVersion = 0): Buffer {
  const manifest: ArchiveManifest = {
    schemaVersion,
    appVersion: '0.0.0',
    createdAt: NOW,
    domains: domains.map((d) => d.domain),
    secretsMode: 'excluded',
  };
  return packArchive(manifest, domains);
}

describe('PortabilityImportService', () => {
  let h: TestDbHandle;
  let svc: PortabilityImportService;

  beforeEach(() => {
    h = createTestDb();
    // CryptoService stub: encrypt prefixes, decrypt strips it, key present.
    const crypto = {
      isEnabled: () => true,
      encrypt: (v: string) => `v1:${v}`,
      decrypt: (v: string) => (v.startsWith('v1:') ? v.slice(3) : v),
    };
    svc = new PortabilityImportService(h.db, crypto as never);
  });
  afterEach(() => h.close());

  const rows = (sql: string) => h.sqlite.prepare(sql).all() as Array<Record<string, unknown>>;
  const one = (sql: string) => h.sqlite.prepare(sql).get() as Record<string, unknown>;

  describe('restore (replace)', () => {
    it('de-hydrates every domain faithfully — JSON, booleans, children, cross-refs', () => {
      const res = svc.restore(archive(sampleDomains()), { mode: 'replace', dryRun: false });
      expect(res.ok).toBe(true);
      expect(res.inserted).toMatchObject({ projects: 1, tasks: 2, notes: 1, routines: 1, approvalRules: 1, workflows: 1 });

      // Tasks: parent + JSON tags + derived fields dropped.
      expect(rows('SELECT id FROM tasks')).toHaveLength(2);
      const t1 = one("SELECT * FROM tasks WHERE id='t1'");
      expect(t1['project_id']).toBe('p1');
      expect(JSON.parse(t1['tags'] as string)).toEqual(['a', 'b']);
      expect(JSON.parse(t1['ai_review'] as string).verdict).toBe('approve');
      // pr_status / check status are derived — never written as columns.
      expect(t1['pr_status']).toBeUndefined();

      // Task children + dependency edge.
      expect(rows("SELECT * FROM task_events WHERE task_id='t1'")).toHaveLength(1);
      expect(JSON.parse((one("SELECT data FROM task_events WHERE id='e1'")['data']) as string)).toEqual({ note: 'hi' });
      expect(rows("SELECT * FROM task_links WHERE task_id='t1'")).toHaveLength(1);
      const dep = one('SELECT * FROM task_dependencies');
      expect(dep).toMatchObject({ task_id: 't1', depends_on_task_id: 't2' });

      // Notes boolean → 0/1.
      expect(one("SELECT completed FROM notes WHERE id='n1'")['completed']).toBe(1);

      // Routine group → items (grandchildren) with correct FK.
      expect(one("SELECT group_id FROM routine_items WHERE id='i1'")['group_id']).toBe('g1');

      // Approval rule mode:boolean + JSON match.
      expect(one("SELECT * FROM approval_rules WHERE id='ar1'")['enabled']).toBe(1);
      expect(JSON.parse(one("SELECT match FROM approval_rules WHERE id='ar1'")['match'] as string)).toEqual({ command: 'ls' });

      // Workflow: nodes/edges reassembled into graph JSON; triggerType extracted; enabled 0/1; archived→null.
      const w = one("SELECT * FROM workflows WHERE id='w1'");
      expect(w['trigger_type']).toBe('manual');
      expect(w['enabled']).toBe(1);
      expect(w['archived_at']).toBeNull();
      expect(JSON.parse(w['graph'] as string)).toEqual({ nodes: [{ id: 'node1', type: 'http' }], edges: [{ from: 'a', to: 'b' }] });
      expect(JSON.parse(w['trigger'] as string)).toEqual({ type: 'manual' });
    });

    it('archived:true maps to a non-null archivedAt (state preserved)', () => {
      const doms: DomainPayload[] = [
        { domain: 'projects', count: 1, records: [{ id: 'p9', name: 'X', tag: 'X', color: '#000', createdAt: NOW, updatedAt: NOW, archived: true }] },
      ];
      svc.restore(archive(doms), { mode: 'replace', dryRun: false });
      expect(one("SELECT archived_at FROM projects WHERE id='p9'")['archived_at']).toBe(NOW);
    });

    it('replace wipes existing rows first', () => {
      svc.restore(archive([{ domain: 'notes', count: 1, records: [{ id: 'old', content: 'old', completed: false, position: 0, createdAt: NOW, updatedAt: NOW }] }]), { mode: 'replace', dryRun: false });
      svc.restore(archive([{ domain: 'notes', count: 1, records: [{ id: 'new', content: 'new', completed: false, position: 0, createdAt: NOW, updatedAt: NOW }] }]), { mode: 'replace', dryRun: false });
      const ids = rows('SELECT id FROM notes').map((r) => r['id']);
      expect(ids).toEqual(['new']); // old wiped
    });
  });

  describe('restore (merge)', () => {
    it('skips ids that already exist, inserts the rest', () => {
      svc.restore(archive([{ domain: 'tasks', count: 1, records: [{ id: 't1', title: 'existing', status: 'todo', priority: 1, createdAt: NOW, updatedAt: NOW, tags: [] }] }]), { mode: 'replace', dryRun: false });
      const res = svc.restore(
        archive([
          {
            domain: 'tasks',
            count: 2,
            records: [
              { id: 't1', title: 'dupe', status: 'todo', priority: 1, createdAt: NOW, updatedAt: NOW, tags: [] },
              { id: 't3', title: 'fresh', status: 'todo', priority: 1, createdAt: NOW, updatedAt: NOW, tags: [] },
            ],
          },
        ]),
        { mode: 'merge', dryRun: false },
      );
      expect(res.inserted['tasks']).toBe(1);
      expect(res.skipped['tasks']).toBe(1);
      expect(one("SELECT title FROM tasks WHERE id='t1'")['title']).toBe('existing'); // not overwritten
      expect(rows('SELECT id FROM tasks')).toHaveLength(2);
    });
  });

  describe('version gate', () => {
    it('refuses a newer-than-us archive', () => {
      expect(() => svc.restore(archive(sampleDomains(), 9999), { mode: 'replace', dryRun: false })).toThrow(/newer-archive|upgrade/);
    });

    it('rejects a malformed archive', () => {
      expect(() => svc.restore(Buffer.from('not a zip'), { mode: 'replace', dryRun: false })).toThrow(/invalid archive/);
    });
  });

  describe('preview', () => {
    it('reports per-domain counts, id conflicts, and the version verdict without writing', () => {
      svc.restore(archive([{ domain: 'tasks', count: 1, records: [{ id: 't1', title: 'x', status: 'todo', priority: 1, createdAt: NOW, updatedAt: NOW, tags: [] }] }]), { mode: 'replace', dryRun: false });
      const before = rows('SELECT id FROM notes').length;
      const preview = svc.preview(archive(sampleDomains()));
      expect(preview.domainCounts).toMatchObject({ tasks: 2, notes: 1, workflows: 1 });
      expect(preview.conflicts['tasks']).toContain('t1');
      expect(preview.compat).toBe('ok');
      expect(preview.importable).toBe(true);
      expect(rows('SELECT id FROM notes').length).toBe(before); // no write
    });
  });
});
