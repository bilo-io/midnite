import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadGatewayException, BadRequestException } from '@nestjs/common';

import type { Project } from '@midnite/shared';
import { ProjectDocsService } from './project-docs.service';
import type { ProjectDocInsert, ProjectDocRow } from '../db/schema';

// In-memory fake mirroring ProjectDocsRepository's surface.
function makeRepo() {
  const rows = new Map<string, ProjectDocRow>();
  return {
    rows,
    create: vi.fn((row: ProjectDocInsert) => {
      const full = { templateId: null, ...row } as ProjectDocRow;
      rows.set(row.id, full);
      return full;
    }),
    get: vi.fn((id: string) => rows.get(id)),
    listByProject: vi.fn((projectId: string) => [...rows.values()].filter((r) => r.projectId === projectId)),
    update: vi.fn((id: string, patch: Partial<ProjectDocInsert>) => {
      const cur = rows.get(id);
      if (!cur) return undefined;
      const next = { ...cur, ...patch } as ProjectDocRow;
      rows.set(id, next);
      return next;
    }),
    remove: vi.fn((id: string) => void rows.delete(id)),
  };
}

function makeProjects(known: Record<string, Partial<Project>>) {
  return {
    getProject: vi.fn((id: string): Project => {
      const p = known[id];
      if (!p) throw new Error(`project ${id} not found`);
      return { id, name: 'Acme', createdAt: '2026-01-01', updatedAt: '2026-01-01', tag: 'ACM', color: '#000000', ...p };
    }),
  };
}

function makeLlm(opts?: { enabled?: boolean; markdown?: string }) {
  return {
    enabled: opts?.enabled ?? true,
    getPlanModel: vi.fn(() => 'test-model'),
    generateStructured: vi.fn(async () => ({
      data: { markdown: opts?.markdown ?? '# Generated' },
      model: 'test-model',
      usage: undefined,
    })),
  };
}

function makeService(opts?: {
  repo?: ReturnType<typeof makeRepo>;
  projects?: ReturnType<typeof makeProjects>;
  llm?: ReturnType<typeof makeLlm>;
}) {
  const repo = opts?.repo ?? makeRepo();
  const projects = opts?.projects ?? makeProjects({ p1: {} });
  const llm = opts?.llm ?? makeLlm();
  const svc = new ProjectDocsService(repo as never, projects as never, llm as never);
  return { svc, repo, projects, llm };
}

beforeEach(() => vi.clearAllMocks());

describe('ProjectDocsService.createDoc', () => {
  it('seeds name/tag/color/content from a known template', () => {
    const { svc } = makeService({ projects: makeProjects({ p1: { name: 'Rocket' } }) });
    const doc = svc.createDoc('p1', { templateId: 'prd' });
    expect(doc.templateId).toBe('prd');
    expect(doc.tag).toBe('PRD');
    expect(doc.name).toBe('Product Requirements Doc');
    expect(doc.content).toMatch(/# Product Requirements Document — Rocket/);
  });

  it('rejects an unknown template id', () => {
    const { svc } = makeService();
    expect(() => svc.createDoc('p1', { templateId: 'ghost' })).toThrow(BadRequestException);
  });

  it('defaults name/tag/color for a from-scratch doc', () => {
    const { svc } = makeService();
    const doc = svc.createDoc('p1', {});
    expect(doc.templateId).toBeUndefined();
    expect(doc.tag).toBe('DOC');
    expect(doc.name).toBe('Untitled document');
  });

  it('404s an unknown project', () => {
    const { svc } = makeService();
    expect(() => svc.createDoc('ghost', {})).toThrow(/not found/);
  });
});

describe('ProjectDocsService.updateDoc', () => {
  it('patches only the given fields', () => {
    const { svc } = makeService();
    const doc = svc.createDoc('p1', {});
    const updated = svc.updateDoc(doc.id, { content: 'new body' });
    expect(updated.content).toBe('new body');
    expect(updated.name).toBe(doc.name);
  });

  it('404s an unknown id', () => {
    const { svc } = makeService();
    expect(() => svc.updateDoc('nope', { content: 'x' })).toThrow(/not found/);
  });
});

describe('ProjectDocsService.removeDoc', () => {
  it('removes the doc', () => {
    const { svc, repo } = makeService();
    const doc = svc.createDoc('p1', {});
    svc.removeDoc(doc.id);
    expect(repo.remove).toHaveBeenCalledWith(doc.id);
    expect(() => svc.getDoc(doc.id)).toThrow(/not found/);
  });

  it('404s an unknown id', () => {
    const { svc } = makeService();
    expect(() => svc.removeDoc('nope')).toThrow(/not found/);
  });
});

describe('ProjectDocsService.generateDoc', () => {
  it('calls the LLM and persists the returned markdown', async () => {
    const llm = makeLlm({ markdown: '# Filled in' });
    const { svc } = makeService({ llm });
    const doc = svc.createDoc('p1', { templateId: 'prd' });
    const updated = await svc.generateDoc(doc.id);
    expect(llm.generateStructured).toHaveBeenCalledTimes(1);
    expect(updated.content).toBe('# Filled in');
  });

  it('falls back to a placeholder when the LLM is disabled', async () => {
    const llm = makeLlm({ enabled: false });
    const { svc } = makeService({ llm });
    const doc = svc.createDoc('p1', {});
    const updated = await svc.generateDoc(doc.id);
    expect(llm.generateStructured).not.toHaveBeenCalled();
    expect(updated.content).toMatch(/AI is not configured/);
  });

  it('404s an unknown id', async () => {
    const { svc } = makeService();
    await expect(svc.generateDoc('nope')).rejects.toThrow(/not found/);
  });

  it('translates an LLM provider error into a 502 with the underlying message', async () => {
    const llm = makeLlm();
    llm.generateStructured = vi.fn(async () => {
      throw new Error('429 rate_limit_error');
    });
    const { svc } = makeService({ llm });
    const doc = svc.createDoc('p1', {});
    await expect(svc.generateDoc(doc.id)).rejects.toThrow(BadGatewayException);
    await expect(svc.generateDoc(doc.id)).rejects.toThrow(/429 rate_limit_error/);
  });

  it('502s when the LLM returns no markdown', async () => {
    const llm = makeLlm();
    llm.generateStructured = vi.fn(async () => ({
      data: {},
      model: 'test-model',
      usage: undefined,
    }));
    const { svc } = makeService({ llm });
    const doc = svc.createDoc('p1', {});
    await expect(svc.generateDoc(doc.id)).rejects.toThrow(BadGatewayException);
  });
});
