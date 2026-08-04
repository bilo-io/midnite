'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, FileCode2 } from 'lucide-react';
import { Diff, Hunk, type EventMap, type ViewType } from 'react-diff-view';
import { cn } from '@/lib/utils';
import { useDiffStatusLabel } from '@/lib/i18n-labels';
import { languageForPath, tokenizeHunks } from './diff-highlight';
import type { MappedDiffFile } from './diff-model';

type Props = {
  mapped: MappedDiffFile;
  viewType: ViewType;
  /** Start expanded (hunks mounted). Collapsed files defer mounting their hunks. */
  defaultOpen?: boolean;
  /** Review mode (Phase 52 C): inline-comment widgets keyed by change key + a
   *  gutter click handler to open a composer. Absent = read-only viewer. */
  widgets?: Record<string, ReactNode>;
  gutterEvents?: EventMap;
};

/**
 * One file in the diff — a collapsible section whose hunks (and syntax
 * tokenization) mount only once expanded, so a large diff stays cheap.
 */
export function DiffFile({ mapped, viewType, defaultOpen = false, widgets, gutterEvents }: Props) {
  const t = useTranslations('prReview');
  const diffStatusLabel = useDiffStatusLabel();
  const { file, diffType, hunks, key } = mapped;
  const [open, setOpen] = useState(defaultOpen);

  // Tokenize lazily and only while open — skipped entirely for collapsed/binary files.
  const tokens = useMemo(() => {
    if (!open || file.binary) return null;
    return tokenizeHunks(hunks, languageForPath(file.path));
  }, [open, file.binary, file.path, hunks]);

  return (
    <section id={key} className="scroll-mt-4 overflow-hidden rounded-lg border border-border/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted/70"
      >
        <ChevronRight
          className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
        />
        <FileCode2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs">
          {file.oldPath && file.oldPath !== file.path
            ? t.rich('file.renamedPath', {
                oldPath: file.oldPath,
                path: file.path,
                old: (chunks) => <span className="text-muted-foreground line-through">{chunks}</span>,
              })
            : file.path}
        </span>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
          {diffStatusLabel(diffType)}
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums">
          {file.additions > 0 ? (
            <span className="text-success">{t('viewer.additions', { count: file.additions })}</span>
          ) : null}
          {file.additions > 0 && file.deletions > 0 ? ' ' : null}
          {file.deletions > 0 ? (
            <span className="text-destructive-foreground">{t('viewer.deletions', { count: file.deletions })}</span>
          ) : null}
        </span>
      </button>

      {open ? (
        file.binary ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">{t('file.binary')}</p>
        ) : hunks.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">{t('file.noTextualChanges')}</p>
        ) : (
          <div className={cn('overflow-x-auto text-xs', gutterEvents && 'diff-reviewable')}>
            <Diff
              viewType={viewType}
              diffType={diffType}
              hunks={hunks}
              tokens={tokens}
              widgets={widgets}
              gutterEvents={gutterEvents}
            >
              {(hs) => hs.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
            </Diff>
          </div>
        )
      ) : null}
    </section>
  );
}
