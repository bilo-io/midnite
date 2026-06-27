import { describe, expect, it } from 'vitest';
import { phaseDocFilename, phaseItemAnchor } from './phase-doc.js';

describe('phaseDocFilename', () => {
  it('kebab-cases the name and appends .md', () => {
    expect(phaseDocFilename('Auth Revamp!')).toBe('auth-revamp.md');
  });
  it('strips an existing .md and collapses runs of punctuation', () => {
    expect(phaseDocFilename('  Billing & Invoices.md ')).toBe('billing-invoices.md');
  });
  it('falls back to a stable default for an empty slug', () => {
    expect(phaseDocFilename('!!!')).toBe('phase-doc.md');
  });
});

describe('phaseItemAnchor', () => {
  it('strips the checkbox marker and slugifies the line', () => {
    expect(phaseItemAnchor('- [ ] Replace session cookies with JWTs')).toBe(
      'replace-session-cookies-with-jwts',
    );
  });
  it('is stable across checked/unchecked state and markdown emphasis', () => {
    expect(phaseItemAnchor('- [x] **Audit** the `login` form')).toBe(
      phaseItemAnchor('- [ ] Audit the login form'),
    );
  });
  it('truncates to a tag-sized slug without a trailing hyphen', () => {
    const anchor = phaseItemAnchor('- [ ] ' + 'word '.repeat(40));
    expect(anchor.length).toBeLessThanOrEqual(80);
    expect(anchor.endsWith('-')).toBe(false);
  });
});
