import { describe, expect, it } from 'vitest';
import { templateListRows, parseCredFlag } from './template.js';
import type { WorkflowTemplateSummary } from '@midnite/shared';

const t: WorkflowTemplateSummary = {
  id: 'tpl-1',
  slug: 'ai-code-review',
  name: 'AI Code Review',
  description: 'Reviews PRs with Claude',
  category: 'github',
  tags: ['code-review', 'ai'],
  credentialSlots: [{ key: 'github-token', type: 'github' }],
  published: true,
  authorId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('templateListRows', () => {
  it('renders slug, name, category, tags, slots', () => {
    const rows = templateListRows([t]);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row![0]).toBe('ai-code-review');
    expect(row![1]).toBe('AI Code Review');
    expect(row![2]).toBe('github');
    expect(row![3]).toBe('code-review, ai');
    expect(row![4]).toBe('github-token');
  });

  it('renders dash for empty tags and slots', () => {
    const bare: WorkflowTemplateSummary = { ...t, tags: [], credentialSlots: [] };
    const [row] = templateListRows([bare]);
    expect(row![3]).toBe('—');
    expect(row![4]).toBe('—');
  });
});

describe('parseCredFlag', () => {
  it('splits on first =', () => {
    const [slot, credId] = parseCredFlag('github-token=cred-abc-123');
    expect(slot).toBe('github-token');
    expect(credId).toBe('cred-abc-123');
  });

  it('allows = in the credId value', () => {
    const [slot, credId] = parseCredFlag('slot=abc=def');
    expect(slot).toBe('slot');
    expect(credId).toBe('abc=def');
  });

  it('throws on missing =', () => {
    expect(() => parseCredFlag('noequalssign')).toThrow('invalid --cred');
  });

  it('throws when slot is empty (= at start)', () => {
    expect(() => parseCredFlag('=credId')).toThrow('invalid --cred');
  });

  it('throws when credId is empty (= at end)', () => {
    expect(() => parseCredFlag('slot=')).toThrow('invalid --cred');
  });
});
