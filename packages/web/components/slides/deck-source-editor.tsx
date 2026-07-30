'use client';

import { useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { MarkdownPreview } from '@/components/markdown-preview';
import { SyntaxMarkdownTextarea } from '@/components/syntax-markdown-textarea';
import { useIsMobile } from '@/hooks/use-media-query';
import { useLocalStorage } from '@/lib/use-local-storage';
import { clamp, cn } from '@/lib/utils';

const MIN_PCT = 25;
const MAX_PCT = 75;
const STEP_PCT = 2;

type Props = {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  ariaLabel?: string;
  /** Shown in the preview pane in place of the rendered markdown when `value` is blank. */
  emptyPreviewMessage: ReactNode;
};

/**
 * The Slides deck editor's source pane: a syntax-highlighted markdown textarea
 * side-by-side with its live preview, split by a draggable (and arrow-key
 * resizable) divider. The split ratio persists across sessions. Below the
 * `md` breakpoint the two panes stack instead — a fixed-width split doesn't
 * fit a phone, and there's no divider to drag there anyway.
 */
export function DeckSourceEditor({ value, onChange, minHeight = 360, ariaLabel, emptyPreviewMessage }: Props) {
  const t = useTranslations('slides');
  const isMobile = useIsMobile();
  const [splitPct, setSplitPct] = useLocalStorage('midnite.slides.editorSplitPct', 50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitPct(clamp(((e.clientX - rect.left) / rect.width) * 100, MIN_PCT, MAX_PCT));
    },
    [setSplitPct],
  );

  const stopDrag = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDrag);
  }, [onPointerMove]);

  // Belt-and-braces: drop the window listeners if the component unmounts mid-drag.
  useEffect(() => stopDrag, [stopDrag]);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
  };

  const onKeyResize = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSplitPct((p) => clamp(p - STEP_PCT, MIN_PCT, MAX_PCT));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSplitPct((p) => clamp(p + STEP_PCT, MIN_PCT, MAX_PCT));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSplitPct(50);
    }
  };

  const preview = (
    <div className="min-w-0 flex-1 overflow-y-auto rounded-md border border-border/60 bg-background px-4 py-3">
      {value.trim() ? (
        <MarkdownPreview content={value} />
      ) : (
        <p className="text-sm italic text-muted-foreground">{emptyPreviewMessage}</p>
      )}
    </div>
  );

  const editor = <SyntaxMarkdownTextarea value={value} onChange={onChange} ariaLabel={ariaLabel} className="flex-1" />;

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex" style={{ minHeight: minHeight / 2 }}>
          {editor}
        </div>
        <div className="flex" style={{ minHeight: minHeight / 2 }}>
          {preview}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-stretch" style={{ minHeight }}>
      <div style={{ width: `${splitPct}%` }} className="flex min-w-0">
        {editor}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('editor.resizePanels')}
        aria-valuenow={Math.round(splitPct)}
        aria-valuemin={MIN_PCT}
        aria-valuemax={MAX_PCT}
        tabIndex={0}
        onPointerDown={startDrag}
        onKeyDown={onKeyResize}
        onDoubleClick={() => setSplitPct(50)}
        className={cn(
          'mx-1.5 w-1.5 shrink-0 cursor-col-resize self-stretch rounded-full bg-border/60 transition-colors',
          'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent',
        )}
      />
      <div style={{ width: `${100 - splitPct}%` }} className="flex min-w-0">
        {preview}
      </div>
    </div>
  );
}
