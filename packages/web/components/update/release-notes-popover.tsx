'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';

import { MarkdownPreview } from '@/components/markdown-preview';
import { fetchReleaseNotes } from '@/lib/release-notes';
import { docsChangelogUrl, GITHUB_RELEASES_URL } from '@midnite/shared';
import { cn } from '@/lib/utils';

type Rect = { top: number; left: number };
type FetchStatus = 'idle' | 'loading' | 'ready' | 'failed';

export type ReleaseNotesPopoverProps = {
  /** The available version — its CHANGELOG section is shown; also the trigger label (`v…`). */
  version: string;
  /** Manifest `notesUrl`, if any — the primary target for the secondary "release page" link. */
  notesUrl?: string;
  className?: string;
};

/**
 * The banner's version string as a button that opens a release-notes popover
 * (Phase 71 Theme F). On first open it fetches the CHANGELOG and renders just this
 * version's `## [x.y.z]` section (markdown), plus two always-present secondary
 * links: the **full changelog** (the docs app, deep-linked to this version) and
 * the **release page** (`notesUrl` or GitHub releases). Notes fail soft — if they
 * can't be fetched the section is replaced by a short note and the links stand, so
 * the update is never blocked on notes.
 *
 * The popover renders in a portal with fixed positioning (like `FilterPills`) so
 * it's never clipped by the banner's `overflow-hidden` animation wrapper. It reads
 * as a normal card surface (not the banner's inverted one) since it's on `body`.
 */
export function ReleaseNotesPopover({ version, notesUrl, className }: ReleaseNotesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const fetchStartedRef = useRef(false);

  // Fixed positioning below the trigger, clamped so a wide popover never spills off
  // the right edge of a narrow viewport.
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 340;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setRect({ top: r.bottom + 6, left });
  }, []);

  // Open lifecycle: place + reposition on scroll/resize, close on outside-click /
  // Escape, and move focus into the popover for keyboard users (Escape returns it).
  useEffect(() => {
    if (!open) return undefined;
    place();
    const focusTimer = setTimeout(() => popRef.current?.focus(), 0);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  // Fetch the notes once, lazily, the first time the popover opens. Gated on a ref
  // (not `status`) so the `loading` state transition doesn't re-run this effect and
  // abort its own in-flight fetch.
  useEffect(() => {
    if (!open || fetchStartedRef.current) return undefined;
    fetchStartedRef.current = true;
    const ac = new AbortController();
    setStatus('loading');
    void fetchReleaseNotes(version, ac.signal).then((body) => {
      if (ac.signal.aborted) return;
      setNotes(body);
      setStatus(body ? 'ready' : 'failed');
    });
    return () => ac.abort();
  }, [open, version]);

  const changelogUrl = docsChangelogUrl(version);
  const releaseUrl = notesUrl ?? GITHUB_RELEASES_URL;

  return (
    <span className={cn('inline', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="font-semibold underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70"
      >
        {`v${version}`}
      </button>

      {open && rect
        ? createPortal(
            <div
              ref={popRef}
              role="dialog"
              aria-label={`Release notes for v${version}`}
              tabIndex={-1}
              style={{ position: 'fixed', top: rect.top, left: rect.left, width: 340 }}
              className="z-[70] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl focus:outline-none"
            >
              <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
                <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-semibold">{`What's new in v${version}`}</span>
              </div>

              <div className="max-h-[min(60vh,22rem)] overflow-auto px-3.5 py-3">
                {status === 'loading' ? (
                  <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                    Loading release notes…
                  </p>
                ) : status === 'ready' && notes ? (
                  <MarkdownPreview content={notes} />
                ) : (
                  <p className="py-2 text-sm text-muted-foreground">
                    Release notes aren&apos;t available right now — see the full changelog or the
                    release page below.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1 border-t border-border p-1.5">
                <a
                  href={changelogUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FileText aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
                  Full changelog
                  <ExternalLink aria-hidden className="ml-auto h-3 w-3 text-muted-foreground" />
                </a>
                <a
                  href={releaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
                  Release page
                  <ExternalLink aria-hidden className="ml-auto h-3 w-3 text-muted-foreground" />
                </a>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
