import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Idea } from '@midnite/shared';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { IdeaTable } from './IdeaTable';

afterEach(cleanup);

const NOW = '2026-06-26T00:00:00.000Z';

function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: 'idea-1',
    title: 'Test idea',
    body: 'Body text',
    status: 'draft',
    tags: [],
    projectId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('IdeaTable', () => {
  it('shows empty state when no ideas', () => {
    render(<IdeaTable ideas={[]} />);
    expect(screen.getByText(/no ideas yet/i)).toBeTruthy();
  });

  it('renders idea title and status', () => {
    render(<IdeaTable ideas={[makeIdea({ title: 'My great idea', status: 'refined' })]} />);
    expect(screen.getByText('My great idea')).toBeTruthy();
    expect(screen.getByText('Refined')).toBeTruthy();
  });

  it('renders tags', () => {
    render(<IdeaTable ideas={[makeIdea({ tags: ['alpha', 'beta'] })]} />);
    expect(screen.getByText(/alpha/)).toBeTruthy();
  });
});
