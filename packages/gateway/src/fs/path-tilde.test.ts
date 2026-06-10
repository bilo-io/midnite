import { describe, expect, it } from 'vitest';
import { collapseTilde, expandTilde } from './path-tilde';

const HOME = '/Users/ada';

describe('collapseTilde', () => {
  it('collapses the home directory itself to ~', () => {
    expect(collapseTilde(HOME, HOME)).toBe('~');
  });

  it('collapses a path under home', () => {
    expect(collapseTilde('/Users/ada/Dev/midnite', HOME)).toBe('~/Dev/midnite');
  });

  it('leaves paths outside home untouched', () => {
    expect(collapseTilde('/opt/work', HOME)).toBe('/opt/work');
  });

  it('does not collapse a sibling whose name shares the home prefix', () => {
    expect(collapseTilde('/Users/adamant/x', HOME)).toBe('/Users/adamant/x');
  });
});

describe('expandTilde', () => {
  it('expands a bare ~ to home', () => {
    expect(expandTilde('~', HOME)).toBe(HOME);
  });

  it('expands ~/ paths', () => {
    expect(expandTilde('~/Dev/midnite', HOME)).toBe('/Users/ada/Dev/midnite');
  });

  it('leaves absolute paths untouched', () => {
    expect(expandTilde('/opt/work', HOME)).toBe('/opt/work');
  });

  it('round-trips with collapseTilde', () => {
    const abs = '/Users/ada/Dev/midnite';
    expect(expandTilde(collapseTilde(abs, HOME), HOME)).toBe(abs);
  });
});
