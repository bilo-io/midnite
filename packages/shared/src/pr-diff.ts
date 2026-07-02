import { z } from 'zod';

// --- In-app PR diff (Phase 52 Theme A) ---
// The gateway fetches a task's GitHub PR diff (via its `prUrl`) and parses the
// raw unified diff into this **structured** shape so the web can render a file
// tree + hunks without re-parsing a blob. Fetch mirrors the PR-status strategy
// (gh-first + anonymous REST fallback) and is fail-open; large diffs drop whole
// files past a byte budget and report them via `truncated` + `hiddenFiles`
// (never a silent cut — see phase-52 Decision §6).

/** Per-file change kind, derived from the diff's `new file` / `deleted` / `rename` markers. */
export const PR_DIFF_FILE_STATUSES = ['added', 'modified', 'removed', 'renamed'] as const;
export type PrDiffFileStatus = (typeof PR_DIFF_FILE_STATUSES)[number];

/** A single line inside a hunk. `content` excludes the leading +/-/space marker. */
export const PrDiffLineSchema = z.object({
  kind: z.enum(['add', 'del', 'context']),
  content: z.string(),
  /** 1-based line number in the old file; absent on added lines. */
  oldLine: z.number().int().positive().optional(),
  /** 1-based line number in the new file; absent on removed lines. */
  newLine: z.number().int().positive().optional(),
});
export type PrDiffLine = z.infer<typeof PrDiffLineSchema>;

/** A `@@ … @@` hunk: its range header plus the parsed lines. */
export const PrDiffHunkSchema = z.object({
  /** The raw `@@ -a,b +c,d @@ heading` line, verbatim (useful for display). */
  header: z.string(),
  oldStart: z.number().int().nonnegative(),
  oldLines: z.number().int().nonnegative(),
  newStart: z.number().int().nonnegative(),
  newLines: z.number().int().nonnegative(),
  lines: z.array(PrDiffLineSchema),
});
export type PrDiffHunk = z.infer<typeof PrDiffHunkSchema>;

export const PrDiffFileSchema = z.object({
  /** New path (or the old path for a deletion). */
  path: z.string(),
  /** Previous path — present only for a rename. */
  oldPath: z.string().optional(),
  status: z.enum(PR_DIFF_FILE_STATUSES),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  /** Binary / non-textual file — no hunks are parsed. */
  binary: z.boolean(),
  hunks: z.array(PrDiffHunkSchema),
});
export type PrDiffFile = z.infer<typeof PrDiffFileSchema>;

export const PrDiffSchema = z.object({
  /** The task's PR URL this diff was fetched from. */
  prUrl: z.string().url(),
  files: z.array(PrDiffFileSchema),
  /** Total additions/deletions across the *included* files. */
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  /** True when the byte budget dropped one or more whole files. */
  truncated: z.boolean(),
  /** Count of files omitted by truncation (0 when not truncated). */
  hiddenFileCount: z.number().int().nonnegative(),
  /** Paths of the omitted files, so the tree can show "N files hidden". */
  hiddenFiles: z.array(z.string()),
  /** ISO timestamp of the fetch. */
  fetchedAt: z.string(),
});
export type PrDiff = z.infer<typeof PrDiffSchema>;
