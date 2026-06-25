'use client';

import { useMemo, useRef, useState } from 'react';
import { Braces, ChevronRight, Database } from 'lucide-react';
import { ExpressionError, resolveExpression, type ExpressionContext } from '@midnite/shared';
import {
  applySuggestion,
  expressionTree,
  insertReference,
  suggestAt,
  type Suggestion,
  type TreeEntry,
} from '@/lib/expression-editor';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/** Compact, single-line-ish rendering of a resolved preview value. */
function renderPreview(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

/**
 * The n8n-style expression editor for a single templatable field: a monospace
 * input with reference autocomplete, a click-to-insert data picker drawn from the
 * last run, and an inline resolved-value preview. The grammar + resolution are
 * the shared contract; this is purely the design-time affordance over them.
 */
export function ExpressionField({
  value,
  onChange,
  placeholder,
  fieldLabel,
  context,
  hasData,
}: {
  value: unknown;
  onChange: (v: string) => void;
  placeholder?: string;
  fieldLabel: string;
  context: ExpressionContext;
  hasData: boolean;
}) {
  const text = typeof value === 'string' ? value : '';
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(text.length);
  const [acOpen, setAcOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const tree = useMemo(() => expressionTree(context), [context]);
  const suggestion = useMemo(
    () => (acOpen ? suggestAt(text, cursor, context) : { from: cursor, to: cursor, items: [] }),
    [acOpen, text, cursor, context],
  );
  const items = suggestion.items;

  // Resolve the field for the preview against the last run's data. A malformed or
  // unresolved reference surfaces its message rather than the value.
  const preview = useMemo((): { ok: boolean; text: string } | null => {
    if (!text.trim()) return null;
    try {
      return { ok: true, text: renderPreview(resolveExpression(text, context)) };
    } catch (err) {
      return { ok: false, text: err instanceof ExpressionError ? err.message : 'cannot resolve' };
    }
  }, [text, context]);

  const syncCursor = () => setCursor(inputRef.current?.selectionStart ?? text.length);

  /** Apply new text + caret, refocus, and keep the editor's cursor state in sync. */
  const commit = (next: string, caret: number) => {
    onChange(next);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
      setCursor(caret);
    });
  };

  const accept = (item: Suggestion) => {
    const res = applySuggestion(text, suggestion, item);
    setAcOpen(false);
    commit(res.value, res.cursor);
  };

  const insertFromTree = (ref: string) => {
    const res = insertReference(text, cursor, ref);
    commit(res.value, res.cursor);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (acOpen && items.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (a - 1 + items.length) % items.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        accept(items[Math.min(active, items.length - 1)]!);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAcOpen(false);
        return;
      }
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          className={cn(inputClass, 'font-mono text-xs')}
          value={text}
          spellCheck={false}
          aria-label={`${fieldLabel} expression`}
          placeholder={placeholder ?? '{{ $json.field }}'}
          onChange={(e) => {
            onChange(e.target.value);
            setCursor(e.target.selectionStart ?? e.target.value.length);
            setActive(0);
            setAcOpen(true);
          }}
          onKeyDown={onKeyDown}
          onKeyUp={syncCursor}
          onClick={syncCursor}
          onFocus={() => setAcOpen(true)}
          onBlur={() => setTimeout(() => setAcOpen(false), 120)}
        />
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-label={`Toggle data picker for ${fieldLabel}`}
          aria-pressed={pickerOpen}
          title="Insert a reference from run data"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input transition-colors',
            pickerOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <Database className="h-4 w-4" />
        </button>
      </div>

      {acOpen && items.length ? (
        <ul role="listbox" aria-label={`${fieldLabel} expression suggestions`} className="overflow-hidden rounded-md border border-border/60 bg-popover shadow-sm">
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                // Use mousedown so the input's blur doesn't fire before the click.
                onMouseDown={(e) => {
                  e.preventDefault();
                  accept(item);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs',
                  i === active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/40',
                )}
              >
                <span className="truncate font-mono">{item.label}</span>
                {item.detail ? <span className="shrink-0 truncate text-[10px] text-muted-foreground">{item.detail}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {pickerOpen ? (
        <div className="rounded-md border border-border/60 bg-card/40 p-1">
          {tree.length ? (
            // role="group" (not "tree"): the rows are click-to-insert buttons, not a
            // keyboard-navigable treegrid; "tree" would demand role="treeitem" children
            // (axe aria-required-children), whereas "group" carries the label without it.
            <div className="max-h-44 overflow-y-auto" role="group" aria-label={`${fieldLabel} data picker`}>
              {tree.map((entry) => (
                <TreeRow key={entry.ref} entry={entry} depth={0} onInsert={insertFromTree} />
              ))}
            </div>
          ) : (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">
              No run data yet — run the workflow once to explore its data here.
            </p>
          )}
        </div>
      ) : null}

      {preview ? (
        <div className="flex items-start gap-1.5 text-[11px]">
          <span className="mt-px shrink-0 text-muted-foreground">=</span>
          <pre
            // Focusable so keyboard users can scroll the overflowing preview, which has
            // no focusable content of its own (axe scrollable-region-focusable).
            tabIndex={0}
            className={cn(
              'max-h-24 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono',
              preview.ok ? 'text-foreground' : 'text-destructive',
            )}
          >
            {preview.text || (preview.ok ? '(empty)' : '')}
          </pre>
        </div>
      ) : !hasData ? (
        <p className="text-[11px] text-muted-foreground">
          Reference run data, e.g. <code className="font-mono">{'{{ $json.field }}'}</code>. Run once to preview values.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Reference run data with <code className="font-mono">{'{{ }}'}</code> — pick a field with the data button.
        </p>
      )}
    </div>
  );
}

/** One row of the data-picker tree; expandable, with a click-to-insert reference. */
function TreeRow({
  entry,
  depth,
  onInsert,
}: {
  entry: TreeEntry;
  depth: number;
  onInsert: (ref: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = Boolean(entry.children?.length);
  return (
    <div>
      <div
        className="flex items-center gap-1 rounded text-xs hover:bg-accent/40"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? `Collapse ${entry.key}` : `Expand ${entry.key}`}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onInsert(entry.ref)}
          title={`Insert ${entry.ref}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
        >
          <Braces className="h-3 w-3 shrink-0 text-muted-foreground/70" />
          <span className="shrink-0 font-mono text-foreground">{entry.key}</span>
          <span className="truncate text-[10px] text-muted-foreground">{entry.preview}</span>
        </button>
      </div>
      {open && hasChildren ? (
        <div>
          {entry.children!.map((child) => (
            <TreeRow key={child.ref} entry={child} depth={depth + 1} onInsert={onInsert} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
