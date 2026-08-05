'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownPreview } from '@/components/markdown-preview';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  defaultMode?: 'edit' | 'preview';
  /** Extra controls rendered on the left of the mode toggle row. */
  label?: ReactNode;
  /**
   * Accessible name for the editor textarea — the visible `label` is an arbitrary
   * node rendered beside the mode toggle, not associated with the field, so the
   * textarea needs its own name (axe `label`). Defaults to the translated
   * `common.editor.contentAria` when a caller supplies nothing more specific.
   */
  ariaLabel?: string;
};

/**
 * A markdown field that toggles between a raw editor (monospace textarea) and a
 * rendered, read-only "pretty" preview.
 *
 * i18n (Phase 82 Theme D): copy lives under `common.editor.*`; the Edit tab reuses
 * the shared `common.edit`. A caller-supplied `ariaLabel` wins so a specific field
 * ("Plan document", "Memory note") can name itself — the default is translated.
 */
export function MarkdownEditor({
  value,
  onChange,
  minHeight = 280,
  defaultMode = 'preview',
  label,
  ariaLabel,
}: Props) {
  const t = useTranslations('common');
  const [mode, setMode] = useState<'edit' | 'preview'>(defaultMode);

  const tab = (m: 'edit' | 'preview', icon: ReactNode, text: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors',
        mode === m
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {text}
    </button>
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        {label ?? <span />}
        <div className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-card/40 p-0.5">
          {tab('preview', <Eye className="h-3.5 w-3.5" />, t('editor.previewTab'))}
          {tab('edit', <Pencil className="h-3.5 w-3.5" />, t('edit'))}
        </div>
      </div>
      {mode === 'edit' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel ?? t('editor.contentAria')}
          spellCheck={false}
          className="resize-y font-mono text-xs leading-relaxed"
          style={{ minHeight }}
        />
      ) : (
        <div
          className="overflow-y-auto rounded-md border border-border/60 bg-background px-4 py-3"
          style={{ minHeight }}
        >
          {value.trim() ? (
            <MarkdownPreview content={value} />
          ) : (
            <p className="text-sm italic text-muted-foreground">{t('editor.nothingToPreview')}</p>
          )}
        </div>
      )}
    </div>
  );
}
