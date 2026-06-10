import { z } from 'zod';

// Contract for the gateway's directory browser, which backs the folder picker.
// Paths are exchanged in `~`-form (the gateway collapses/expands the home
// prefix), so what the client stores is portable across a changing home dir.

export const DirEntrySchema = z.object({
  name: z.string(),
  /** Full path of the entry, in `~`-form. */
  path: z.string(),
});

export const BrowseDirResponseSchema = z.object({
  /** The directory that was listed, in `~`-form. */
  path: z.string(),
  /** Parent directory in `~`-form, or null at the filesystem root. */
  parent: z.string().nullable(),
  /** Immediate subdirectories, sorted by name. */
  entries: z.array(DirEntrySchema),
});

export type DirEntry = z.infer<typeof DirEntrySchema>;
export type BrowseDirResponse = z.infer<typeof BrowseDirResponseSchema>;
