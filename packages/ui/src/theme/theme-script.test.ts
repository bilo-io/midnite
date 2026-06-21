import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, themeInitScript } from './theme-script';

describe('theme-script', () => {
  it('namespaces the storage key', () => {
    expect(THEME_STORAGE_KEY).toBe('midnite.theme');
  });

  it('is a self-invoking script referencing the storage key', () => {
    expect(themeInitScript.startsWith('(function(){')).toBe(true);
    expect(themeInitScript).toContain(THEME_STORAGE_KEY);
  });

  it('toggles the `dark` class and sets color-scheme (the no-flash apply step)', () => {
    expect(themeInitScript).toContain("classList");
    expect(themeInitScript).toContain('dark');
    expect(themeInitScript).toContain('colorScheme');
  });

  it('is wrapped in try/catch so a storage failure never blocks first paint', () => {
    expect(themeInitScript).toContain('try{');
    expect(themeInitScript).toContain('catch(e){}');
  });
});
