import { beforeEach, describe, expect, it } from 'vitest';
import { useOfficeStore } from './office-store';

const store = useOfficeStore;

beforeEach(() => {
  store.setState({
    nearKitchen: false,
    nearPlaystation: false,
    onBreak: false,
    nearBoard: false,
    boardOpen: false,
    libraryOpen: false,
    playstationOpen: false,
    active: null,
  });
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

describe('retro-games / playstation', () => {
  it('setNearPlaystation sets the proximity flag', () => {
    store.getState().setNearPlaystation(true);
    expect(store.getState().nearPlaystation).toBe(true);
    store.getState().setNearPlaystation(false);
    expect(store.getState().nearPlaystation).toBe(false);
  });

  it('openPlaystation sets playstationOpen and closes other panels', () => {
    store.getState().openLibrary();
    store.getState().openPlaystation();
    const s = store.getState();
    expect(s.playstationOpen).toBe(true);
    expect(s.libraryOpen).toBe(false);
    expect(s.boardOpen).toBe(false);
    expect(s.active).toBeNull();
  });

  it('closePlaystation clears playstationOpen', () => {
    store.getState().openPlaystation();
    store.getState().closePlaystation();
    expect(store.getState().playstationOpen).toBe(false);
  });

  it('reset clears nearPlaystation and playstationOpen', () => {
    store.getState().setNearPlaystation(true);
    store.getState().openPlaystation();
    store.getState().reset();
    const s = store.getState();
    expect(s.nearPlaystation).toBe(false);
    expect(s.playstationOpen).toBe(false);
  });
});
