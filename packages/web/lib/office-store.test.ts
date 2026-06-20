import { beforeEach, describe, expect, it } from 'vitest';
import { useOfficeStore } from './office-store';

const store = useOfficeStore;

beforeEach(() => {
  store.setState({ nearKitchen: false, onBreak: false, nearBoard: false, boardOpen: false, active: null });
});

describe('coffee break', () => {
  it('toggleBreak flips onBreak', () => {
    expect(store.getState().onBreak).toBe(false);
    store.getState().toggleBreak();
    expect(store.getState().onBreak).toBe(true);
    store.getState().toggleBreak();
    expect(store.getState().onBreak).toBe(false);
  });

  it('setNearKitchen sets the proximity flag', () => {
    store.getState().setNearKitchen(true);
    expect(store.getState().nearKitchen).toBe(true);
    store.getState().setNearKitchen(false);
    expect(store.getState().nearKitchen).toBe(false);
  });

  it('reset clears transient proximity state but leaves the break flag', () => {
    store.getState().setNearKitchen(true);
    store.getState().toggleBreak();
    store.getState().openBoard();

    store.getState().reset();

    const s = store.getState();
    expect(s.nearKitchen).toBe(false);
    expect(s.boardOpen).toBe(false);
    // onBreak is a personal presence flag, not transient scene state.
    expect(s.onBreak).toBe(true);
  });
});
