import { afterEach, describe, expect, it, vi } from 'vitest';

import { extractVersionSection, fetchReleaseNotes } from './release-notes';

const CHANGELOG = `# Changelog

All notable changes.

## [Unreleased]

_Nothing yet._

## [0.2.0] - 2026-07-18

### Added
- Release-notes popover on the update banner.

### Fixed
- A thing.

## [0.1.0] - 2026-06-26

The first tagged release.
`;

describe('extractVersionSection', () => {
  it('returns just the matching version section, up to the next heading', () => {
    const section = extractVersionSection(CHANGELOG, '0.2.0');
    expect(section).toContain('## [0.2.0] - 2026-07-18');
    expect(section).toContain('Release-notes popover');
    // Stops before the next version.
    expect(section).not.toContain('0.1.0');
    expect(section).not.toContain('first tagged release');
  });

  it('captures the final section through to end-of-file', () => {
    const section = extractVersionSection(CHANGELOG, '0.1.0');
    expect(section).toContain('## [0.1.0] - 2026-06-26');
    expect(section).toContain('first tagged release');
  });

  it('returns null when the version has no section', () => {
    expect(extractVersionSection(CHANGELOG, '9.9.9')).toBeNull();
  });

  it('does not confuse a prefix version (0.1.0 vs 0.1.10)', () => {
    const doc = `## [0.1.10] - 2026-08-01\nten\n\n## [0.1.0] - 2026-06-26\nzero\n`;
    expect(extractVersionSection(doc, '0.1.0')).toContain('zero');
    expect(extractVersionSection(doc, '0.1.0')).not.toContain('ten');
  });
});

describe('fetchReleaseNotes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the version section on a successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(CHANGELOG, { status: 200 })),
    );
    const notes = await fetchReleaseNotes('0.2.0');
    expect(notes).toContain('Release-notes popover');
  });

  it('returns null on a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 404 })),
    );
    expect(await fetchReleaseNotes('0.2.0')).toBeNull();
  });

  it('returns null (never throws) when the fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await expect(fetchReleaseNotes('0.2.0')).resolves.toBeNull();
  });
});
