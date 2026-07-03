import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ApprovalLogEntry } from '@midnite/shared';

const listApprovalLog = vi.fn();
vi.mock('@/lib/api', () => ({ listApprovalLog: (...a: unknown[]) => listApprovalLog(...a) }));
// The WS listener is a no-op in tests (no provider).
vi.mock('@/lib/task-events', () => ({ useGuardrailsListener: () => undefined }));

import { SafetyDecisionsFeed } from './safety-decisions-feed';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const entry = (over: Partial<ApprovalLogEntry>): ApprovalLogEntry => ({
  id: Math.random().toString(36),
  sessionId: 'sess-1',
  taskId: null,
  toolName: 'Bash',
  summary: null,
  resolution: 'auto-deny',
  ruleId: 'blast-radius:force-push',
  decidedBy: 'policy',
  createdAt: '2026-07-03T10:00:00.000Z',
  ...over,
});

describe('SafetyDecisionsFeed', () => {
  it('renders recent decisions with resolution + tool', async () => {
    listApprovalLog.mockResolvedValue({
      entries: [entry({ resolution: 'auto-deny', toolName: 'Bash' }), entry({ resolution: 'auto-allow', toolName: 'Read' })],
      total: 2,
      page: 1,
      limit: 20,
    });
    render(<SafetyDecisionsFeed />);
    await waitFor(() => expect(screen.getByText('auto-deny')).toBeInTheDocument());
    expect(screen.getByText('auto-allow')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('shows an empty state when there are no decisions', async () => {
    listApprovalLog.mockResolvedValue({ entries: [], total: 0, page: 1, limit: 20 });
    render(<SafetyDecisionsFeed />);
    await waitFor(() => expect(screen.getByText(/No decisions recorded yet/)).toBeInTheDocument());
  });
});
