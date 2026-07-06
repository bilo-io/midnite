import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ChatBar } from './chat-bar';
import type { ChatCommandState } from '@/hooks/use-chat-command';

const parse = { intent: { type: 'createTask', title: 'x' }, source: 'grammar', confidence: 1, inferencePath: 'deterministic' } as const;

function state(over: Partial<ChatCommandState> = {}): ChatCommandState {
  return {
    phase: 'idle',
    preview: null,
    result: null,
    affectedCount: 1,
    error: null,
    busy: false,
    canUndo: false,
    submit: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    undo: vi.fn(),
    reset: vi.fn(),
    ...over,
  };
}

afterEach(cleanup);

describe('ChatBar', () => {
  it('shows examples when idle + empty', () => {
    render(<ChatBar command="" state={state()} />);
    expect(screen.getByText(/type a natural-language command/i)).toBeInTheDocument();
  });

  it('renders the preview + Confirm/Cancel in the confirm phase', () => {
    const s = state({
      phase: 'confirm',
      preview: { parse, description: 'Create task “x”.', willMutate: true, confirmation: 'confirm' },
    });
    render(<ChatBar command="add x" state={s} />);
    expect(screen.getByText('Create task “x”.')).toBeInTheDocument();
    expect(screen.getByText(/no AI used/i)).toBeInTheDocument(); // deterministic cost line
    fireEvent.click(screen.getByTestId('chat-confirm'));
    expect(s.confirm).toHaveBeenCalled();
  });

  it('notes a follow-up fan-out count', () => {
    const s = state({
      phase: 'confirm',
      affectedCount: 3,
      preview: { parse, description: 'Set priority.', willMutate: true, confirmation: 'confirm' },
    });
    render(<ChatBar command="make those p1" state={s} />);
    expect(screen.getByText(/applies to 3 tasks/i)).toBeInTheDocument();
  });

  it('warns on a low-confidence parse', () => {
    const s = state({
      phase: 'confirm',
      preview: { parse: { ...parse, confidence: 0.3, source: 'llm' }, description: 'd', willMutate: true, confirmation: 'confirm' },
    });
    render(<ChatBar command="fuzzy" state={s} />);
    expect(screen.getByText(/low confidence/i)).toBeInTheDocument();
  });

  it('shows the result + Undo when done', () => {
    const s = state({
      phase: 'done',
      canUndo: true,
      result: { summary: 'Created task “x”.', affectedIds: ['n1'], undoToken: 'tok', inferencePath: 'local', confirmation: 'none' },
    });
    render(<ChatBar command="add x" state={s} />);
    expect(screen.getByTestId('chat-result')).toHaveTextContent('Created task “x”.');
    expect(screen.getByText(/via local model/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('chat-undo'));
    expect(s.undo).toHaveBeenCalled();
  });

  it('renders an error', () => {
    render(<ChatBar command="x" state={state({ phase: 'error', error: 'gateway down' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('gateway down');
  });
});
