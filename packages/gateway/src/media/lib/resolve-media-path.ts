import { isAbsolute, resolve, sep } from 'node:path';

/**
 * Resolve a stored media `filePath` against the uploads base, refusing any path
 * that escapes it. This is the **serve-time** guard for `GET /media/:id/file`:
 * even though {@link isSafeMediaFilePath} rejects traversal at write time, a
 * legacy/imported row could carry a hostile path, so the read path never trusts
 * the stored value — it re-confines it here (Phase 60 C, arbitrary-file-read fix).
 *
 * Returns the safe absolute path to stream, or `null` when the path would resolve
 * outside the uploads base (an absolute path elsewhere, or `..` traversal).
 */
export function resolveMediaPath(filePath: string, uploadsDir?: string): string | null {
  const base = resolve(uploadsDir ?? 'uploads');
  const candidate = isAbsolute(filePath) ? resolve(filePath) : resolve(base, filePath);
  if (candidate !== base && !candidate.startsWith(base + sep)) return null;
  return candidate;
}
