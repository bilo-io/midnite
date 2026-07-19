// Release-notes fetch + parse for the update banner (Phase 71 Theme F).
//
// The CHANGELOG is authored as `## [x.y.z] - date` sections (Keep a Changelog).
// The banner shows *only* the available version's section, so we fetch the full
// raw CHANGELOG once and slice out the matching heading→next-heading block. Every
// path is fail-soft: a network error or a missing section yields `null`, and the
// popover falls back to the docs page + the GitHub releases link.

import { GITHUB_RAW_CHANGELOG_URL } from '@midnite/shared';

/** Escape a version string for use inside a `RegExp` (dots are the only meta char here). */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract the markdown for a single version's section from a Keep-a-Changelog
 * document. Matches a level-2 heading whose text starts with `[<version>]`
 * (e.g. `## [0.1.4] - 2026-07-18`) and returns everything from that heading up to
 * the next level-2 heading (or the end of the file), trimmed. Returns `null` when
 * the version has no section. Pure + exported for unit tests.
 */
export function extractVersionSection(changelog: string, version: string): string | null {
  const lines = changelog.split('\n');
  const headingStart = new RegExp(`^##\\s+\\[${escapeRegExp(version)}\\]`);
  const anyH2 = /^##\s+/;

  const start = lines.findIndex((line) => headingStart.test(line));
  if (start === -1) return null;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (anyH2.test(lines[i]!)) {
      end = i;
      break;
    }
  }

  const section = lines.slice(start, end).join('\n').trim();
  return section.length > 0 ? section : null;
}

/**
 * Fetch the CHANGELOG and return the given version's section markdown, or `null`
 * if it can't be fetched/found. Never throws — a non-OK response or a network
 * error (offline, CORS, rate-limit) resolves to `null` so the caller degrades to
 * the fallback links. An optional `AbortSignal` cancels an in-flight fetch when
 * the popover closes.
 */
export async function fetchReleaseNotes(
  version: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(GITHUB_RAW_CHANGELOG_URL, {
      signal,
      headers: { Accept: 'text/plain' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return extractVersionSection(text, version);
  } catch {
    // Offline / CORS / aborted — the popover falls back to the docs + release links.
    return null;
  }
}
