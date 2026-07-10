'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronUp, Folder, FolderOpen, FolderPlus, Home, Loader2 } from 'lucide-react';
import type { BrowseDirResponse } from '@midnite/shared';
import { browseDirectory, createDirectory } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// A path that failed to open only because it doesn't exist yet (vs. a
// permission error or a non-directory) can be offered up for creation.
const MISSING_DIR = /ENOENT|no such file or directory/i;

type Props = {
  /** Where to open the browser (`~`-form); defaults to the home directory. */
  initialPath?: string;
  /** Called with the chosen directory in `~`-form. */
  onSelect: (path: string) => void;
  onClose: () => void;
};

// A directory browser over the gateway host's filesystem. The OS folder dialog
// can't hand a browser a real path, and sessions run on the gateway host anyway,
// so the picker navigates *that* machine. Paths are exchanged in `~`-form.
export function FolderPicker({ initialPath, onSelect, onClose }: Props) {
  const [data, setData] = useState<BrowseDirResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The path we last tried to open — so a "create folder" offer knows what to
  // create when that path turns out not to exist.
  const [attempted, setAttempted] = useState<string | undefined>(initialPath);
  const [creating, setCreating] = useState(false);

  const navigate = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);
    setAttempted(path);
    try {
      setData(await browseDirectory(path));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cannot open that folder');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async () => {
    if (!attempted) return;
    setCreating(true);
    setError(null);
    try {
      setData(await createDirectory(attempted));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cannot create that folder');
    } finally {
      setCreating(false);
    }
  }, [attempted]);

  useEffect(() => {
    void navigate(initialPath);
  }, [navigate, initialPath]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = data?.path ?? initialPath ?? '~';

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-background/50 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose a folder"
          className="pointer-events-auto flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs" title={current}>
              {current}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label="Go to home directory"
              onClick={() => void navigate('~')}
            >
              <Home className="h-4 w-4" />
            </Button>
          </header>

          <div className="min-h-[12rem] flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-start gap-3 px-2 py-4">
                <p className="text-sm text-destructive">{error}</p>
                {attempted && MISSING_DIR.test(error) ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      This folder doesn’t exist yet. Create it?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void create()}
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FolderPlus className="h-4 w-4" />
                      )}
                      <span className="min-w-0 truncate">Create {attempted}</span>
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <ul className="space-y-0.5">
                {data?.parent ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => void navigate(data.parent ?? undefined)}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
                    >
                      <ChevronUp className="h-4 w-4 shrink-0" />
                      <span className="truncate">..</span>
                    </button>
                  </li>
                ) : null}
                {(data?.entries ?? []).map((entry) => (
                  <li key={entry.path}>
                    <button
                      type="button"
                      onClick={() => void navigate(entry.path)}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{entry.name}</span>
                    </button>
                  </li>
                ))}
                {!data?.parent && (data?.entries.length ?? 0) === 0 ? (
                  <p className="px-2.5 py-4 text-sm text-muted-foreground">No subfolders here.</p>
                ) : null}
              </ul>
            )}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3">
            <span className="truncate text-[11px] text-muted-foreground">
              Sessions in this project will run here.
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn(loading || !!error ? 'pointer-events-none opacity-50' : '')}
                disabled={loading || !!error || !data}
                onClick={() => {
                  if (data) onSelect(data.path);
                  onClose();
                }}
              >
                Use this folder
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
