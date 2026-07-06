import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';

const previewChatCommand = vi.fn();
const runChatCommand = vi.fn();
const undoChatCommand = vi.fn();
const invalidateData = vi.fn();

vi.mock('@/lib/api', () => ({
  previewChatCommand: (...a: unknown[]) => previewChatCommand(...a),
  runChatCommand: (...a: unknown[]) => runChatCommand(...a),
  undoChatCommand: (...a: unknown[]) => undoChatCommand(...a),
}));
vi.mock('@/lib/data-refresh', () => ({ invalidateData: () => invalidateData() }));

import { useChatCommand } from './use-chat-command';

const parse = { intent: { type: 'createTask', title: 'x' }, source: 'grammar', confidence: 1, inferencePath: 'deterministic' };

beforeEach(() => {
  previewChatCommand.mockReset();
  runChatCommand.mockReset();
  undoChatCommand.mockReset();
  invalidateData.mockReset();
});
afterEach(cleanup);

describe('useChatCommand', () => {
  it('parks a mutating command at confirm, then executes on confirm()', async () => {
    previewChatCommand.mockResolvedValue({ parse, description: 'Create task “x”.', willMutate: true, confirmation: 'confirm' });
    runChatCommand.mockResolvedValue({ parse, result: { summary: 'Created task “x”.', affectedIds: ['new1'], undoToken: 'tok1', inferencePath: 'deterministic', confirmation: 'none' } });

    const { result } = renderHook(() => useChatCommand());
    act(() => result.current.submit('add "x"'));
    await waitFor(() => expect(result.current.phase).toBe('confirm'));
    expect(runChatCommand).not.toHaveBeenCalled(); // gated — no write yet

    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(runChatCommand).toHaveBeenCalledWith('add "x"', true);
    expect(result.current.result?.affectedIds).toEqual(['new1']);
    expect(result.current.canUndo).toBe(true);
    expect(invalidateData).toHaveBeenCalled();
  });

  it('runs a read-only query immediately (no confirm)', async () => {
    previewChatCommand.mockResolvedValue({ parse: { ...parse, intent: { type: 'query', text: 'show blocked' } }, description: 'Answer: show blocked', willMutate: false, confirmation: 'none' });
    runChatCommand.mockResolvedValue({ parse, result: { summary: '2 blocked.', affectedIds: [], inferencePath: 'deterministic', confirmation: 'none' } });

    const { result } = renderHook(() => useChatCommand());
    act(() => result.current.submit('show blocked'));
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(runChatCommand).toHaveBeenCalledWith('show blocked', false);
    expect(result.current.canUndo).toBe(false); // no undo token
  });

  it('cancel() drops the pending command without writing', async () => {
    previewChatCommand.mockResolvedValue({ parse, description: 'd', willMutate: true, confirmation: 'confirm' });
    const { result } = renderHook(() => useChatCommand());
    act(() => result.current.submit('add "x"'));
    await waitFor(() => expect(result.current.phase).toBe('confirm'));
    act(() => result.current.cancel());
    expect(result.current.phase).toBe('idle');
    expect(runChatCommand).not.toHaveBeenCalled();
  });

  it('expands a follow-up to one confirmed command per prior affected id', async () => {
    previewChatCommand.mockResolvedValue({ parse, description: 'd', willMutate: true, confirmation: 'confirm' });
    // Return by command text: the seed touches t1+t2; each follow-up touches one.
    runChatCommand.mockImplementation((text: string) => {
      if (text.includes('t1')) return Promise.resolve({ parse, result: { summary: 'a', affectedIds: ['t1'], undoToken: 'k1', inferencePath: 'deterministic', confirmation: 'none' } });
      if (text.includes('t2')) return Promise.resolve({ parse, result: { summary: 'b', affectedIds: ['t2'], undoToken: 'k2', inferencePath: 'deterministic', confirmation: 'none' } });
      return Promise.resolve({ parse, result: { summary: 'seed', affectedIds: ['t1', 't2'], undoToken: 'seed', inferencePath: 'deterministic', confirmation: 'none' } });
    });

    const { result } = renderHook(() => useChatCommand());
    // Seed prior context by running a first command that affects t1 + t2.
    act(() => result.current.submit('bulk add a, b'));
    await waitFor(() => expect(result.current.phase).toBe('confirm'));
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.result?.affectedIds).toEqual(['t1', 't2']));

    // Now the follow-up: "make those p1" → one command per prior id.
    act(() => result.current.submit('make those p1'));
    await waitFor(() => expect(result.current.affectedCount).toBe(2));
    await waitFor(() => expect(result.current.phase).toBe('confirm'));
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.result?.summary).toMatch(/applied to 2 tasks/i));
    expect(runChatCommand).toHaveBeenCalledWith('make t1 p1', true);
    expect(runChatCommand).toHaveBeenCalledWith('make t2 p1', true);
  });

  it('undo() reverts via the stored token', async () => {
    previewChatCommand.mockResolvedValue({ parse, description: 'd', willMutate: true, confirmation: 'confirm' });
    runChatCommand.mockResolvedValue({ parse, result: { summary: 'made', affectedIds: ['n1'], undoToken: 'tok1', inferencePath: 'deterministic', confirmation: 'none' } });
    undoChatCommand.mockResolvedValue({ result: { summary: 'Reverted 1 change.', affectedIds: ['n1'], inferencePath: 'deterministic', confirmation: 'none' } });

    const { result } = renderHook(() => useChatCommand());
    act(() => result.current.submit('add "x"'));
    await waitFor(() => expect(result.current.phase).toBe('confirm'));
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.canUndo).toBe(true));
    act(() => result.current.undo());
    await waitFor(() => expect(result.current.result?.summary).toMatch(/reverted/i));
    expect(undoChatCommand).toHaveBeenCalledWith('tok1');
    expect(result.current.canUndo).toBe(false);
  });

  it('surfaces an error when preview fails', async () => {
    previewChatCommand.mockRejectedValue(new Error('gateway down'));
    const { result } = renderHook(() => useChatCommand());
    act(() => result.current.submit('add "x"'));
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.error).toMatch(/gateway down/i);
  });
});
