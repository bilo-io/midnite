import { describe, expect, it } from 'vitest';
import type { ImportPreview, ImportResult } from '@midnite/shared';

import {
  exportSummaryLines,
  importPreviewLines,
  importResultLines,
  parseExportDomains,
  parseImportMode,
  type ExportSummary,
} from './portability.js';

describe('parseImportMode', () => {
  it('accepts merge and replace', () => {
    expect(parseImportMode('merge')).toBe('merge');
    expect(parseImportMode('replace')).toBe('replace');
  });

  it('throws a legible error on anything else (no silent default)', () => {
    expect(() => parseImportMode('wipe')).toThrow(/--mode must be "merge" or "replace" \(got "wipe"\)/);
    expect(() => parseImportMode('')).toThrow(/--mode must be/);
  });
});

describe('parseExportDomains', () => {
  it('returns undefined for unset/empty (⇒ all domains)', () => {
    expect(parseExportDomains(undefined)).toBeUndefined();
    expect(parseExportDomains('')).toBeUndefined();
    expect(parseExportDomains('  ,  ')).toBeUndefined();
  });

  it('splits, trims, and drops blanks', () => {
    expect(parseExportDomains('tasks, projects ,,workflows')).toEqual(['tasks', 'projects', 'workflows']);
  });
});

describe('exportSummaryLines', () => {
  it('renders totals + per-domain counts', () => {
    const summary: ExportSummary = {
      domains: ['tasks', 'projects'],
      counts: { tasks: 3, projects: 1 },
      schemaVersion: 42,
      secretsMode: 'omit',
    };
    expect(exportSummaryLines(summary)).toEqual([
      '2 domains, 4 records (schema v42, secrets: omit)',
      '  tasks: 3',
      '  projects: 1',
    ]);
  });
});

const preview = (over: Partial<ImportPreview> = {}): ImportPreview => ({
  manifest: {
    createdAt: '2026-07-09T00:00:00Z',
    schemaVersion: 42,
    appVersion: '1.0.0',
    domains: ['tasks', 'projects'],
    secretsMode: 'excluded',
  },
  domainCounts: { tasks: 2, projects: 1 },
  conflicts: {},
  compat: 'ok',
  importable: true,
  ...over,
});

describe('importPreviewLines', () => {
  it('renders schema line + totals + per-domain, no conflicts', () => {
    expect(importPreviewLines(preview(), 'merge')).toEqual([
      'archive: schema v42 (ok), secrets: excluded',
      '2 domains, 3 records, 0 id conflict(s) — mode: merge',
      '  projects: 1',
      '  tasks: 2',
    ]);
  });

  it('annotates per-domain conflicts (singular/plural) and totals them', () => {
    const lines = importPreviewLines(preview({ conflicts: { tasks: ['a', 'b'], projects: ['c'] } }), 'replace');
    expect(lines[1]).toBe('2 domains, 3 records, 3 id conflict(s) — mode: replace');
    expect(lines).toContain('  tasks: 2 (2 conflicts)');
    expect(lines).toContain('  projects: 1 (1 conflict)');
  });
});

describe('importResultLines', () => {
  it('renders inserted/skipped totals + per-domain', () => {
    const result: ImportResult = {
      ok: true,
      mode: 'merge',
      inserted: { tasks: 2, projects: 0 },
      skipped: { projects: 1 },
      reindexed: true,
    };
    expect(importResultLines(result)).toEqual([
      'restored (merge): 2 inserted, 1 skipped',
      '  projects: +0 (1 skipped)',
      '  tasks: +2',
    ]);
  });

  it('appends the reindex-warned note when reindex failed', () => {
    const result: ImportResult = { ok: true, mode: 'replace', inserted: { tasks: 1 }, skipped: {}, reindexed: false };
    expect(importResultLines(result).at(-1)).toMatch(/search reindex warned/);
  });
});
