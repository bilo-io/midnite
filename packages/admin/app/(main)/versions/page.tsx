import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { VersionsView } from '@/components/versions-view';

/**
 * Versions & releases (Phase 73 Theme F). A **server component**: it reads the
 * repo-root `CHANGELOG.md` from disk at BUILD time (App Router RSCs run during
 * `next build`, even under `output: 'export'`) and hands the raw string to the
 * client `<VersionsView>`, which renders it as Markdown and fetches the live
 * release channels at runtime. This is the Next-idiomatic bundle: Vite's `?raw`
 * import doesn't exist under webpack, so we read the file instead of importing it.
 */
function readChangelog(): string {
  // At build, cwd is the admin package dir; the changelog lives at the repo root.
  const candidates = [
    join(process.cwd(), '..', '..', 'CHANGELOG.md'),
    join(process.cwd(), 'CHANGELOG.md'),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      // Try the next candidate; fall through to '' so the page still renders.
    }
  }
  return '';
}

export default function VersionsPage() {
  return <VersionsView changelog={readChangelog()} />;
}
